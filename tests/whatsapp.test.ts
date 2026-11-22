import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El adaptador importa "server-only" y el bot completo: se aíslan para probar solo el canal.
vi.mock("server-only", () => ({}));
const procesarMensaje = vi.fn();
vi.mock("@/lib/bot/procesar", () => ({ procesarMensaje: (...a: unknown[]) => procesarMensaje(...a) }));

const { firmaValida, verificarSuscripcion, mensajesDelWebhook, manejarMensaje } = await import("@/lib/canales/whatsapp");

const SECRETO = "app-secret-de-prueba";
const PHONE_ID = "100000000000001";
const firmar = (cuerpo: string, secreto = SECRETO) => "sha256=" + createHmac("sha256", secreto).update(cuerpo).digest("hex");
type MensajeWA = Parameters<typeof manejarMensaje>[0];
const payload = (mensajes: MensajeWA[], phoneId = PHONE_ID) => ({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneId }, messages: mensajes } }] }],
});

let salidasLog: string[] = [];
beforeEach(() => {
  vi.stubEnv("WHATSAPP_APP_SECRET", SECRETO);
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verify-de-prueba");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", PHONE_ID);
  vi.stubEnv("WHATSAPP_TOKEN", ""); // sin token: las llamadas a Graph se escriben en consola (modo prueba)
  salidasLog = [];
  vi.spyOn(console, "log").mockImplementation((m: string) => void salidasLog.push(m));
  procesarMensaje.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

/** Cuerpos JSON enviados a /messages (excluye el "leído/escribiendo"). */
const enviados = () => salidasLog
  .filter((l) => l.startsWith("[whatsapp:sin-token]") && l.includes("/messages"))
  .map((l) => JSON.parse(l.slice(l.indexOf("{"))))
  .filter((b) => b.status !== "read");

describe("seguridad del webhook de WhatsApp", () => {
  it("verificación GET: devuelve el challenge solo con el token correcto", () => {
    expect(verificarSuscripcion(new URLSearchParams("hub.mode=subscribe&hub.verify_token=verify-de-prueba&hub.challenge=42"))).toBe("42");
    expect(verificarSuscripcion(new URLSearchParams("hub.mode=subscribe&hub.verify_token=otro&hub.challenge=42"))).toBeNull();
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "");
    expect(verificarSuscripcion(new URLSearchParams("hub.mode=subscribe&hub.verify_token=&hub.challenge=42"))).toBeNull();
  });

  it("firma X-Hub-Signature-256: acepta la correcta y rechaza las demás", () => {
    const cuerpo = JSON.stringify(payload([]));
    expect(firmaValida(cuerpo, firmar(cuerpo))).toBe(true);
    expect(firmaValida(cuerpo, firmar(cuerpo, "otro-secreto"))).toBe(false);
    expect(firmaValida(cuerpo + " ", firmar(cuerpo))).toBe(false); // cuerpo alterado
    expect(firmaValida(cuerpo, null)).toBe(false);
    expect(firmaValida(cuerpo, "sha1=abc")).toBe(false);
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    expect(firmaValida(cuerpo, firmar(cuerpo))).toBe(false); // sin secreto configurado, nada pasa
  });
});

describe("lectura del payload", () => {
  it("toma solo mensajes del número propio e ignora estados de entrega", () => {
    const m = { from: "000000000001", id: "wamid.1", type: "text", text: { body: "hola" } };
    expect(mensajesDelWebhook(payload([m]))).toHaveLength(1);
    expect(mensajesDelWebhook(payload([m], "999"))).toHaveLength(0);
    expect(mensajesDelWebhook({ object: "page", entry: [] })).toHaveLength(0);
    expect(mensajesDelWebhook({ object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: PHONE_ID } } }] }] })).toHaveLength(0);
  });
});

describe("traducción de entrada y salida", () => {
  it("texto -> EntradaBot y botones -> mensaje interactivo de botones", async () => {
    procesarMensaje.mockResolvedValue([{ tipo: "botones", texto: "¿Quieres avisos?", botones: [{ id: "optin:si", titulo: "✅ Sí, quiero avisos" }, { id: "optin:no", titulo: "No, gracias" }] }]);
    await manejarMensaje({ from: "000000000001", id: "wamid.A", type: "text", text: { body: "hola" } });
    expect(procesarMensaje).toHaveBeenCalledWith({ canal: "whatsapp", usuarioId: "000000000001", mensajeId: "wa:wamid.A", tipo: "texto", texto: "hola" });
    const [b] = enviados();
    expect(b).toMatchObject({ messaging_product: "whatsapp", to: "000000000001", type: "interactive" });
    expect(b.interactive.type).toBe("button");
    expect(b.interactive.action.buttons).toEqual([
      { type: "reply", reply: { id: "optin:si", title: "✅ Sí, quiero avisos" } },
      { type: "reply", reply: { id: "optin:no", title: "No, gracias" } },
    ]);
  });

  it("respuesta de lista -> botón del bot; lista -> mensaje interactivo de lista", async () => {
    procesarMensaje.mockResolvedValue([{ tipo: "lista", texto: "¿De qué comunidad eres?", boton: "Ver comunidades", filas: [{ id: "com:1", titulo: "Kantuta Pampa" }] }]);
    await manejarMensaje({ from: "000000000001", id: "wamid.B", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "optin:si" } } });
    expect(procesarMensaje.mock.calls[0][0]).toMatchObject({ tipo: "boton", botonId: "optin:si" });
    const [b] = enviados();
    expect(b.interactive.type).toBe("list");
    expect(b.interactive.action).toEqual({ button: "Ver comunidades", sections: [{ title: "Opciones", rows: [{ id: "com:1", title: "Kantuta Pampa" }] }] });
  });

  it("tarjeta -> texto con formato de WhatsApp y su audio", async () => {
    procesarMensaje.mockResolvedValue([{ tipo: "tarjeta", id: "sequia-durante-01", titulo: "Cuida el agua", pasos: ["Uno.", "Dos.", "Tres."],
      fuente: "FAO Bolivia: p. 33 (pasos 1, 2 y 3)", pagina: "p. 33", etiquetaEstado: "Verificada contra fuente", audioOggUrl: "https://x.supabase.co/a.ogg" }]);
    await manejarMensaje({ from: "000000000001", id: "wamid.C", type: "text", text: { body: "¿qué hago?" } });
    const [t, a] = enviados();
    expect(t.text.body).toBe("*Cuida el agua*\n1) Uno.\n2) Dos.\n3) Tres.\n\n_Fuente: FAO Bolivia: p. 33 (pasos 1, 2 y 3)_\n_Verificada contra fuente_");
    expect(a).toMatchObject({ type: "audio", audio: { link: "https://x.supabase.co/a.ogg" } });
  });

  it("imagen u otro tipo -> respuesta fija, sin llamar al bot", async () => {
    await manejarMensaje({ from: "000000000001", id: "wamid.D", type: "image" });
    expect(procesarMensaje).not.toHaveBeenCalled();
    expect(enviados()[0].text.body).toBe("Por ahora solo recibo audios o texto.");
  });

  it("si el bot falla, la persona recibe el mensaje de error (no silencio)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    procesarMensaje.mockRejectedValue(new Error("caída"));
    await manejarMensaje({ from: "000000000001", id: "wamid.E", type: "text", text: { body: "hola" } });
    expect(enviados().at(-1).text.body).toBe("Ocurrió un error. Escribe 0 para ver el menú.");
  });
});
