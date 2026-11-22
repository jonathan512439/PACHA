import { createHash, createHmac } from "node:crypto";
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

const { webhookVonageValido, jwtVonageValido, opcionElegida, armarMensajes, cuerpoVonage, manejarWebhookVonage } = await import("@/lib/canales/vonage");

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const jwt = (claims: object, secreto: string) => {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })), p = b64url(JSON.stringify(claims));
  return `Bearer ${h}.${p}.${b64url(createHmac("sha256", secreto).update(`${h}.${p}`).digest())}`;
};

let log: string[] = [];
beforeEach(() => {
  vi.stubEnv("VONAGE_WEBHOOK_SECRET", "clave-larga");
  vi.stubEnv("VONAGE_SIGNATURE_SECRET", "firma-secreta");
  vi.stubEnv("VONAGE_API_KEY", "");
  vi.stubEnv("VONAGE_API_SECRET", "");
  vi.stubEnv("VONAGE_WHATSAPP_FROM", "14157386102"); // sin clave ni secreto: los envíos se escriben en consola
  log = [];
  vi.spyOn(console, "log").mockImplementation((m: string) => void log.push(m));
  procesarMensaje.mockReset();
  contexto = {};
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const enviados = () => log.filter((l) => l.startsWith("[vonage:sin-credenciales]")).map((l) => JSON.parse(l.slice(l.indexOf("{"))));

describe("seguridad del webhook de Vonage", () => {
  const cuerpo = JSON.stringify({ message_uuid: "u1", text: "hola" });
  it("clave de la URL", () => {
    expect(webhookVonageValido(new URL("https://x.example/api/webhooks/vonage?k=clave-larga"), null, cuerpo)).toBe(true);
    expect(webhookVonageValido(new URL("https://x.example/api/webhooks/vonage?k=otra"), null, cuerpo)).toBe(false);
    expect(webhookVonageValido(new URL("https://x.example/api/webhooks/vonage"), null, cuerpo)).toBe(false);
  });
  it("JWT firmado, con payload_hash del cuerpo", () => {
    const hash = createHash("sha256").update(cuerpo).digest("hex");
    expect(jwtVonageValido(jwt({ iss: "Vonage", payload_hash: hash }, "firma-secreta"), cuerpo)).toBe(true);
    expect(jwtVonageValido(jwt({ iss: "Vonage", payload_hash: hash }, "otra"), cuerpo)).toBe(false);
    expect(jwtVonageValido(jwt({ iss: "Vonage", payload_hash: "00" }, "firma-secreta"), cuerpo)).toBe(false);
  });
});

describe("entrada y salida", () => {
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
  it("tarjeta: imagen con pie y audio MP3, con el formato de la Messages API", () => {
    const { mensajes } = armarMensajes([{
      tipo: "tarjeta", id: "t1", titulo: "Protege a tus animales", pasos: ["a", "b", "c"], fuente: "FAO, p. 3", pagina: "3",
      etiquetaEstado: "Verificada", imagenUrl: "https://x.example/i.webp", audioOggUrl: "https://x.example/a.ogg", audioMp3Url: "https://x.example/a.mp3",
    }]);
    expect(mensajes.map((m) => cuerpoVonage("+591 700 00001", m))).toEqual([
      { from: "14157386102", to: "59170000001", channel: "whatsapp", message_type: "image", image: { url: "https://x.example/i.webp", caption: expect.stringContaining("*Protege a tus animales*") } },
      { from: "14157386102", to: "59170000001", channel: "whatsapp", message_type: "audio", audio: { url: "https://x.example/a.mp3" } },
    ]);
  });
});

describe("conversación", () => {
  it("guarda las opciones y convierte la respuesta '1' en el botón", async () => {
    procesarMensaje.mockResolvedValueOnce([{ tipo: "botones", texto: "¿Aceptas?", botones: [{ id: "optin:si", titulo: "Sí" }, { id: "optin:no", titulo: "No" }] }]);
    await manejarWebhookVonage({ channel: "whatsapp", message_uuid: "u1", from: "59170000001", message_type: "text", text: "hola" });
    expect(procesarMensaje.mock.calls[0][0]).toMatchObject({ canal: "whatsapp", usuarioId: "59170000001", tipo: "texto", texto: "hola", mensajeId: "vg:u1" });
    expect(enviados()[0]).toMatchObject({ to: "59170000001", message_type: "text" });
    expect(contexto?.opcionesWA).toHaveLength(2);

    procesarMensaje.mockResolvedValueOnce([{ tipo: "texto", texto: "Listo" }]);
    await manejarWebhookVonage({ channel: "whatsapp", message_uuid: "u2", from: "59170000001", message_type: "text", text: "1" });
    expect(procesarMensaje.mock.calls[1][0]).toMatchObject({ tipo: "boton", botonId: "optin:si" });
    expect(contexto?.opcionesWA).toBeUndefined();
  });
  it("imagen: pide audio o texto sin llamar al bot; estados de entrega se ignoran", async () => {
    await manejarWebhookVonage({ channel: "whatsapp", message_uuid: "u3", from: "59170000001", message_type: "image", image: { url: "https://x.example/m" } });
    await manejarWebhookVonage({ message_uuid: "u4", to: "59170000001", status: "delivered" });
    expect(procesarMensaje).not.toHaveBeenCalled();
    expect(enviados()).toHaveLength(1);
  });
});
