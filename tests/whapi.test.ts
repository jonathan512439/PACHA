import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const procesarMensaje = vi.fn();
vi.mock("@/lib/bot/procesar", () => ({ procesarMensaje: (...a: unknown[]) => procesarMensaje(...a) }));
// Supabase simulado: un suscriptor con contexto en memoria.
let contexto: Record<string, unknown> | null = null;
vi.mock("@/lib/supabase", () => {
  const consulta = () => {
    const q = {
      select: () => q, eq: () => q,
      maybeSingle: async () => ({ data: contexto === null ? null : { id: "s1", contexto } }),
      update: (v: { contexto: Record<string, unknown> }) => { contexto = v.contexto; return q; },
    };
    return q;
  };
  return { db: () => ({ from: consulta }) };
});

const { webhookWhapiValido, mensajesDeWhapi, opcionElegida, armarMensajes, pedidoWhapi, manejarMensajeWhapi } = await import("@/lib/canales/whapi");

let log: string[] = [];
beforeEach(() => {
  vi.stubEnv("WHAPI_WEBHOOK_SECRET", "clave-larga");
  vi.stubEnv("WHAPI_TOKEN", ""); // sin token: los envíos se escriben en consola
  log = [];
  vi.spyOn(console, "log").mockImplementation((m: string) => void log.push(m));
  procesarMensaje.mockReset();
  contexto = {};
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const enviados = () => log.filter((l) => l.startsWith("[whapi:sin-token]")).map((l) => {
  const [, ruta] = l.split(" ");
  return { ruta, ...JSON.parse(l.slice(l.indexOf("{"))) };
});

describe("seguridad del webhook de whapi", () => {
  const u = (q = "") => new URL(`https://x.example/api/webhooks/whapi${q}`);
  it("clave en la cabecera o en la URL", () => {
    expect(webhookWhapiValido(u(), "clave-larga")).toBe(true);
    expect(webhookWhapiValido(u("?k=clave-larga"), null)).toBe(true);
    expect(webhookWhapiValido(u("?k=otra"), null)).toBe(false);
    expect(webhookWhapiValido(u(), "otra")).toBe(false);
    expect(webhookWhapiValido(u(), null)).toBe(false);
  });
  it("sin clave configurada, rechaza todo", () => {
    vi.stubEnv("WHAPI_WEBHOOK_SECRET", "");
    expect(webhookWhapiValido(u("?k="), "")).toBe(false);
  });
});

describe("entrada y salida", () => {
  it("ignora mensajes propios y de grupos", () => {
    const ms = mensajesDeWhapi({ messages: [
      { id: "1", from: "59170000001", chat_id: "59170000001@s.whatsapp.net", type: "text", text: { body: "hola" } },
      { id: "2", from: "59170000001", from_me: true, type: "text" },
      { id: "3", from: "59170000002", chat_id: "123@g.us", type: "text" },
    ] });
    expect(ms.map((m) => m.id)).toEqual(["1"]);
  });
  it("traduce el número o el título a la opción ofrecida", () => {
    const op = [{ id: "optin:si", titulo: "Sí" }, { id: "optin:no", titulo: "No" }];
    expect(opcionElegida("1", op)).toBe("optin:si");
    expect(opcionElegida(" 2) ", op)).toBe("optin:no");
    expect(opcionElegida("si", op)).toBe("optin:si");
    expect(opcionElegida("3", op)).toBeNull();
    expect(opcionElegida("1", undefined)).toBeNull();
  });
  it("junta textos y numera las opciones", () => {
    const { mensajes, opciones } = armarMensajes([
      { tipo: "texto", texto: "Hola" },
      { tipo: "botones", texto: "¿Aceptas?", botones: [{ id: "optin:si", titulo: "Sí" }, { id: "optin:no", titulo: "No" }] },
    ]);
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0].cuerpo).toContain("*2.* No");
    expect(opciones.map((o) => o.id)).toEqual(["optin:si", "optin:no"]);
  });
  it("tarjeta: imagen con pie y audio MP3, con el formato de la API", () => {
    const { mensajes } = armarMensajes([{
      tipo: "tarjeta", id: "t1", titulo: "Protege a tus animales", pasos: ["a", "b", "c"], fuente: "FAO, p. 3", pagina: "3",
      etiquetaEstado: "Verificada", imagenUrl: "https://x.example/i.webp", audioOggUrl: "https://x.example/a.ogg", audioMp3Url: "https://x.example/a.mp3",
    }]);
    expect(mensajes.map((m) => pedidoWhapi("+591 700 00001", m))).toEqual([
      { ruta: "/messages/image", cuerpo: { to: "59170000001", media: "https://x.example/i.webp", caption: expect.stringContaining("*Protege a tus animales*") } },
      { ruta: "/messages/audio", cuerpo: { to: "59170000001", media: "https://x.example/a.mp3" } },
    ]);
  });
});

describe("conversación", () => {
  it("guarda las opciones y convierte la respuesta '1' en el botón", async () => {
    procesarMensaje.mockResolvedValueOnce([{ tipo: "botones", texto: "¿Aceptas?", botones: [{ id: "optin:si", titulo: "Sí" }, { id: "optin:no", titulo: "No" }] }]);
    await manejarMensajeWhapi({ id: "m1", from: "59170000001", type: "text", text: { body: "hola" } });
    expect(procesarMensaje.mock.calls[0][0]).toMatchObject({ canal: "whatsapp", usuarioId: "59170000001", tipo: "texto", texto: "hola", mensajeId: "wh:m1" });
    expect(enviados()[0]).toMatchObject({ ruta: "/messages/text", to: "59170000001" });
    expect(contexto?.opcionesWA).toHaveLength(2);

    procesarMensaje.mockResolvedValueOnce([{ tipo: "texto", texto: "Listo" }]);
    await manejarMensajeWhapi({ id: "m2", from: "59170000001", type: "text", text: { body: "1" } });
    expect(procesarMensaje.mock.calls[1][0]).toMatchObject({ tipo: "boton", botonId: "optin:si" });
    expect(contexto?.opcionesWA).toBeUndefined();
  });
  it("imagen: pide audio o texto sin llamar al bot", async () => {
    await manejarMensajeWhapi({ id: "m3", from: "59170000001", type: "image", image: { id: "x" } });
    expect(procesarMensaje).not.toHaveBeenCalled();
    expect(enviados()).toHaveLength(1);
  });
});
