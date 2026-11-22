import { createHmac } from "node:crypto";
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

const { firmaTwilioValida, numeroDe, opcionElegida, armarMensajes, manejarMensajeTwilio } = await import("@/lib/canales/twilio");

const TOKEN = "token-de-prueba";
const URL_WH = "https://pacha.example/api/webhooks/twilio";
const firmar = (url: string, p: URLSearchParams, token = TOKEN) =>
  createHmac("sha1", token).update(url + [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => k + v).join("")).digest("base64");

let log: string[] = [];
beforeEach(() => {
  vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN);
  vi.stubEnv("TWILIO_ACCOUNT_SID", "");
  vi.stubEnv("TWILIO_WHATSAPP_FROM", ""); // sin credenciales completas: los envíos se escriben en consola
  log = [];
  vi.spyOn(console, "log").mockImplementation((m: string) => void log.push(m));
  procesarMensaje.mockReset();
  contexto = {};
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

const enviados = () => log.filter((l) => l.startsWith("[twilio:sin-credenciales]")).map((l) => JSON.parse(l.slice(l.indexOf("{"))));

describe("seguridad del webhook de Twilio", () => {
  const p = new URLSearchParams({ From: "whatsapp:+59170000001", Body: "hola", MessageSid: "SM1" });
  it("acepta la firma correcta y rechaza otra URL, otro token o sin firma", () => {
    expect(firmaTwilioValida(URL_WH, p, firmar(URL_WH, p))).toBe(true);
    expect(firmaTwilioValida(URL_WH + "x", p, firmar(URL_WH, p))).toBe(false);
    expect(firmaTwilioValida(URL_WH, p, firmar(URL_WH, p, "otro"))).toBe(false);
    expect(firmaTwilioValida(URL_WH, p, null)).toBe(false);
  });
});

describe("entrada", () => {
  it("número sin + ni prefijo", () => {
    expect(numeroDe(new URLSearchParams({ From: "whatsapp:+59170000001" }))).toBe("59170000001");
    expect(numeroDe(new URLSearchParams({ WaId: "59170000002", From: "whatsapp:+59170000001" }))).toBe("59170000002");
  });
  it("traduce el número o el título a la opción ofrecida", () => {
    const op = [{ id: "optin:si", titulo: "Sí" }, { id: "optin:no", titulo: "No" }];
    expect(opcionElegida("1", op)).toBe("optin:si");
    expect(opcionElegida(" 2) ", op)).toBe("optin:no");
    expect(opcionElegida("si", op)).toBe("optin:si");
    expect(opcionElegida("3", op)).toBeNull();
    expect(opcionElegida("1", undefined)).toBeNull();
    expect(opcionElegida("se heló la papa", op)).toBeNull();
  });
});

describe("salida", () => {
  it("junta textos, numera botones y listas de forma continua", () => {
    const { mensajes, opciones } = armarMensajes([
      { tipo: "texto", texto: "Hola" },
      { tipo: "botones", texto: "¿Aceptas?", botones: [{ id: "optin:si", titulo: "Sí" }, { id: "optin:no", titulo: "No" }] },
    ]);
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0].cuerpo).toContain("Hola");
    expect(mensajes[0].cuerpo).toContain("*1.* Sí");
    expect(mensajes[0].cuerpo).toContain("*2.* No");
    expect(opciones.map((o) => o.id)).toEqual(["optin:si", "optin:no"]);
  });
  it("tarjeta: imagen con pie y audio MP3 aparte", () => {
    const { mensajes } = armarMensajes([{
      tipo: "tarjeta", id: "t1", titulo: "Protege a tus animales", pasos: ["a", "b", "c"], fuente: "FAO, p. 3", pagina: "3",
      etiquetaEstado: "Verificada", imagenUrl: "https://x.example/i.webp", audioOggUrl: "https://x.example/a.ogg", audioMp3Url: "https://x.example/a.mp3",
    }]);
    expect(mensajes).toEqual([
      { cuerpo: expect.stringContaining("*Protege a tus animales*"), media: "https://x.example/i.webp" },
      { media: "https://x.example/a.mp3" },
    ]);
  });
});

describe("conversación", () => {
  it("guarda las opciones y convierte la respuesta '1' en el botón", async () => {
    procesarMensaje.mockResolvedValueOnce([{ tipo: "botones", texto: "¿Aceptas?", botones: [{ id: "optin:si", titulo: "Sí" }, { id: "optin:no", titulo: "No" }] }]);
    await manejarMensajeTwilio(new URLSearchParams({ From: "whatsapp:+59170000001", Body: "hola", MessageSid: "SM1", NumMedia: "0" }));
    expect(procesarMensaje.mock.calls[0][0]).toMatchObject({ canal: "whatsapp", usuarioId: "59170000001", tipo: "texto", texto: "hola", mensajeId: "tw:SM1" });
    expect(enviados()[0].para).toBe("59170000001");
    expect(contexto?.opcionesWA).toHaveLength(2);

    procesarMensaje.mockResolvedValueOnce([{ tipo: "texto", texto: "Listo" }]);
    await manejarMensajeTwilio(new URLSearchParams({ From: "whatsapp:+59170000001", Body: "1", MessageSid: "SM2", NumMedia: "0" }));
    expect(procesarMensaje.mock.calls[1][0]).toMatchObject({ tipo: "boton", botonId: "optin:si" });
    expect(contexto?.opcionesWA).toBeUndefined(); // el último mensaje no ofreció opciones
  });
  it("imagen u otro archivo: pide audio o texto sin llamar al bot", async () => {
    await manejarMensajeTwilio(new URLSearchParams({ From: "whatsapp:+59170000001", MessageSid: "SM3", NumMedia: "1", MediaContentType0: "image/jpeg", MediaUrl0: "https://x.example/m" }));
    expect(procesarMensaje).not.toHaveBeenCalled();
    expect(enviados()).toHaveLength(1);
  });
});
