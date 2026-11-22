import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/supabase";
import { MENSAJES, type EntradaBot, type SalidaBot } from "@/contratos/tipos";
import { procesarMensaje } from "@/lib/bot/procesar";
import { normalizar } from "@/lib/bot/textos";
import { textoTarjeta } from "@/lib/canales/whatsapp";

/*
 * WhatsApp por el sandbox de Vonage (Messages API), alternativa a la Cloud API de Meta para la demo.
 * - Mismo canal "whatsapp" para el bot: la persona se identifica por su número sin "+" (igual que con Meta).
 * - Sin botones: las opciones se muestran numeradas y la persona responde con el número.
 *   Las opciones del último mensaje se guardan en subscribers.contexto.opcionesWA para traducir "2" -> botón.
 * - Con VONAGE_API_KEY, VONAGE_API_SECRET y VONAGE_WHATSAPP_FROM, todos los envíos por WhatsApp
 *   (alertas, "¿llegó?", aviso a la técnica) salen por Vonage (lib/canales/enviar.ts).
 * - Límites del sandbox: 1 mensaje por segundo y ~100 mensajes al mes; ventana de 24 h, sin plantillas.
 * - Sin credenciales en desarrollo, los envíos se escriben en la consola.
 */

const env = (k: string) => process.env[k]?.trim() || undefined;
const AUDIO_MAX_BYTES = 1_000_000;
const AUDIO_LARGO = "El audio es muy largo. Mándame uno de menos de un minuto, por favor.";
const CUERPO_MAX = 4096;
const PIE_MAX = 1024;
const AYUDA_NUMERO = "_Responde con el número._";
const PAUSA_MS = 1100; // el sandbox admite 1 mensaje por segundo (y así llegan en orden)

export type OpcionWA = { id: string; titulo: string };
/** Un mensaje saliente: texto, imagen (con pie opcional) o audio. */
export type MensajeVonage = { cuerpo?: string; imagen?: string; audio?: string };

export function vonageActivo(): boolean {
  return !!(env("VONAGE_API_KEY") && env("VONAGE_API_SECRET") && env("VONAGE_WHATSAPP_FROM"));
}

// ---- Seguridad ---------------------------------------------------------------
const b64url = (b: Buffer) => b.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const igual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** JWT HS256 de Vonage (Authorization: Bearer) firmado con el signature secret; si trae payload_hash, debe coincidir con el cuerpo. */
export function jwtVonageValido(cabecera: string | null, cuerpoCrudo: string): boolean {
  const secreto = env("VONAGE_SIGNATURE_SECRET");
  const token = cabecera?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!secreto || !token) return false;
  const [h, p, firma] = token.split(".");
  if (!h || !p || !firma) return false;
  if (!igual(b64url(createHmac("sha256", secreto).update(`${h}.${p}`).digest()), firma)) return false;
  try {
    const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as { payload_hash?: string };
    return !claims.payload_hash || claims.payload_hash === createHash("sha256").update(cuerpoCrudo, "utf8").digest("hex");
  } catch { return false; }
}

/** Acepta el webhook si trae la clave de la URL (?k=VONAGE_WEBHOOK_SECRET) o un JWT válido de Vonage. */
export function webhookVonageValido(url: URL, cabecera: string | null, cuerpoCrudo: string): boolean {
  const clave = env("VONAGE_WEBHOOK_SECRET");
  const k = url.searchParams.get("k");
  if (clave && k && igual(k, clave)) return true;
  return jwtVonageValido(cabecera, cuerpoCrudo);
}

// ---- Entrada: webhook de Vonage -> EntradaBot --------------------------------
export type EntranteVonage = {
  channel?: string; message_uuid?: string; from?: string; to?: string; message_type?: string;
  text?: string; audio?: { url?: string }; image?: { url?: string };
  reply?: { id?: string; title?: string }; button?: { payload?: string; text?: string };
  status?: string; error?: { title?: string; detail?: string; type?: string };
};

/** "2", "2.", " 2) " o el título exacto de una opción -> id del botón. */
export function opcionElegida(texto: string, opciones: OpcionWA[] | undefined): string | null {
  if (!opciones?.length) return null;
  const n = texto.trim().match(/^(\d{1,2})\s*[.)]?$/);
  if (n) return opciones[Number(n[1]) - 1]?.id ?? null;
  const t = normalizar(texto);
  return opciones.find((o) => normalizar(o.titulo) === t)?.id ?? null;
}

async function leerOpciones(usuario: string): Promise<OpcionWA[] | undefined> {
  const { data } = await db().from("subscribers").select("contexto").eq("channel", "whatsapp").eq("channel_user_id", usuario).maybeSingle();
  return (data?.contexto as { opcionesWA?: OpcionWA[] } | null)?.opcionesWA;
}

/** Guarda las opciones del último mensaje (o las borra): un "1" solo vale si el bot acaba de ofrecer opciones. */
async function guardarOpciones(usuario: string, opciones: OpcionWA[]): Promise<void> {
  const { data } = await db().from("subscribers").select("id, contexto").eq("channel", "whatsapp").eq("channel_user_id", usuario).maybeSingle();
  if (!data) return;
  const ctx = { ...((data.contexto as Record<string, unknown>) ?? {}) };
  if (opciones.length) ctx.opcionesWA = opciones;
  else if (ctx.opcionesWA) delete ctx.opcionesWA;
  else return;
  await db().from("subscribers").update({ contexto: ctx }).eq("id", data.id);
}

/** Descarga el audio entrante: primero sin credenciales y, si lo rechaza, con la clave de la cuenta. */
async function descargarAudio(url: string): Promise<{ bytes: Buffer; mime: string }> {
  let r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (r.status === 401 || r.status === 403) r = await fetch(url, { headers: { authorization: basica() }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Vonage: descarga de audio falló (HTTP ${r.status})`);
  if (Number(r.headers.get("content-length") ?? 0) > AUDIO_MAX_BYTES) throw new AudioLargo();
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > AUDIO_MAX_BYTES) throw new AudioLargo();
  const tipo = (r.headers.get("content-type") ?? "").split(";")[0];
  return { bytes, mime: tipo.startsWith("audio/") ? tipo : "audio/ogg" };
}
class AudioLargo extends Error {}

async function traducir(m: EntranteVonage, usuario: string): Promise<{ entrada?: EntradaBot; respuestaDirecta?: string }> {
  const base = { canal: "whatsapp" as const, usuarioId: usuario, mensajeId: `vg:${m.message_uuid}` };
  switch (m.message_type) {
    case "text": {
      const texto = (m.text ?? "").trim();
      if (!texto) return { respuestaDirecta: MENSAJES.soloAudioTexto };
      const boton = opcionElegida(texto, await leerOpciones(usuario));
      if (boton) return { entrada: { ...base, tipo: "boton", botonId: boton } };
      return { entrada: { ...base, tipo: "texto", texto: texto.slice(0, 1000) } };
    }
    case "audio": {
      if (!m.audio?.url) return { respuestaDirecta: MENSAJES.soloAudioTexto };
      try {
        const { bytes, mime } = await descargarAudio(m.audio.url);
        return { entrada: { ...base, tipo: "audio", audio: { base64: bytes.toString("base64"), mime } } };
      } catch (e) {
        if (e instanceof AudioLargo) return { respuestaDirecta: AUDIO_LARGO };
        throw e;
      }
    }
    case "reply":
      if (m.reply?.id) return { entrada: { ...base, tipo: "boton", botonId: m.reply.id.slice(0, 64) } };
      break;
    case "button":
      if (m.button?.payload) return { entrada: { ...base, tipo: "boton", botonId: m.button.payload.slice(0, 64) } };
      break;
  }
  return { respuestaDirecta: MENSAJES.soloAudioTexto }; // imágenes, stickers, ubicación, documentos...
}

// ---- Salida: SalidaBot[] -> mensajes de Vonage --------------------------------
/**
 * Arma los mensajes (pura, sin red). Los textos seguidos van juntos en uno: el sandbox tiene un tope
 * mensual de ~100 mensajes y 1 por segundo.
 */
export function armarMensajes(salidas: SalidaBot[]): { mensajes: MensajeVonage[]; opciones: OpcionWA[] } {
  const mensajes: MensajeVonage[] = [];
  const opciones: OpcionWA[] = [];
  let buffer: string[] = [];
  const vaciar = () => {
    if (buffer.length) mensajes.push({ cuerpo: buffer.join("\n\n").slice(0, CUERPO_MAX) });
    buffer = [];
  };
  const agregar = (t: string) => {
    if (buffer.length && [...buffer, t].join("\n\n").length > CUERPO_MAX) vaciar();
    buffer.push(t);
  };
  const numeradas = (items: { id: string; titulo: string; descripcion?: string }[]) =>
    items.map((o) => {
      opciones.push({ id: o.id, titulo: o.titulo });
      return `*${opciones.length}.* ${o.titulo}${o.descripcion ? ` — ${o.descripcion}` : ""}`;
    }).join("\n");

  for (const s of salidas) {
    switch (s.tipo) {
      case "texto": agregar(s.texto); break;
      case "botones": agregar(`${s.texto}\n\n${numeradas(s.botones)}\n${AYUDA_NUMERO}`); break;
      case "lista": agregar(`${s.texto}\n\n${numeradas(s.filas)}\n${AYUDA_NUMERO}`); break;
      case "audio": vaciar(); mensajes.push({ audio: s.mp3Url ?? s.oggUrl }); break;
      case "tarjeta": {
        vaciar();
        const texto = textoTarjeta(s);
        if (s.imagenUrl && texto.length <= PIE_MAX) mensajes.push({ cuerpo: texto, imagen: s.imagenUrl });
        else {
          if (s.imagenUrl) mensajes.push({ imagen: s.imagenUrl });
          mensajes.push({ cuerpo: texto.slice(0, CUERPO_MAX) });
        }
        const audio = s.audioMp3Url ?? s.audioOggUrl; // Vonage acepta .mp3 para WhatsApp
        if (audio) mensajes.push({ audio });
        break;
      }
    }
  }
  vaciar();
  return { mensajes, opciones };
}

// ---- Cliente de la Messages API ---------------------------------------------
const basica = () => "Basic " + Buffer.from(`${env("VONAGE_API_KEY")}:${env("VONAGE_API_SECRET")}`).toString("base64");
const API = () => env("VONAGE_API_URL") || "https://messages-sandbox.nexmo.com/v1/messages";
const soloDigitos = (s: string) => s.replace(/\D/g, "");
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function cuerpoVonage(para: string, m: MensajeVonage): Record<string, unknown> {
  const base = { from: soloDigitos(env("VONAGE_WHATSAPP_FROM") ?? ""), to: soloDigitos(para), channel: "whatsapp" };
  if (m.imagen) return { ...base, message_type: "image", image: { url: m.imagen, ...(m.cuerpo ? { caption: m.cuerpo } : {}) } };
  if (m.audio) return { ...base, message_type: "audio", audio: { url: m.audio } };
  return { ...base, message_type: "text", text: m.cuerpo ?? "" };
}

async function enviarUno(para: string, m: MensajeVonage): Promise<void> {
  const cuerpo = cuerpoVonage(para, m);
  if (!vonageActivo()) {
    if (process.env.NODE_ENV === "production") throw new Error("Faltan las credenciales de Vonage");
    console.log(`[vonage:sin-credenciales] ${JSON.stringify(cuerpo)}`);
    return;
  }
  const r = await fetch(API(), {
    method: "POST",
    headers: { authorization: basica(), "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { title?: string; detail?: string };
    // 429 = tope mensual del sandbox o más de 1 mensaje por segundo.
    throw new Error(`Vonage: ${r.status} ${j.title ?? ""} ${j.detail ?? ""}`);
  }
}

/** Envía en orden (1 por segundo) y recuerda las opciones numeradas. Lanza error si Vonage rechaza un mensaje. */
export async function enviarSalidasVonage(para: string, salidas: SalidaBot[]): Promise<void> {
  const { mensajes, opciones } = armarMensajes(salidas);
  for (const [i, m] of mensajes.entries()) {
    if (i > 0 && vonageActivo()) await esperar(PAUSA_MS);
    await enviarUno(para, m);
  }
  await guardarOpciones(para, opciones).catch((e) => console.error("vonage: guardar opciones", e));
}

// ---- Punto de entrada (se llama desde after() en el webhook) ---------------
export async function manejarWebhookVonage(m: EntranteVonage): Promise<void> {
  // Estados de entrega: solo interesa el motivo de un fallo.
  if (m.status) {
    if (m.status === "rejected" || m.status === "undelivered" || m.status === "failed")
      console.error(`Vonage: mensaje no entregado a …${(m.to ?? "").slice(-3)} (${m.status}) ${m.error?.title ?? ""} ${m.error?.detail ?? ""}`);
    return;
  }
  if (m.channel && m.channel !== "whatsapp") return;
  const usuario = soloDigitos(m.from ?? "");
  if (!usuario || !m.message_uuid) return;
  try {
    const t = await traducir(m, usuario);
    if (t.respuestaDirecta) return void (await enviarUno(usuario, { cuerpo: t.respuestaDirecta }));
    if (!t.entrada) return;
    const salidas = await procesarMensaje(t.entrada);
    if (salidas.length) await enviarSalidasVonage(usuario, salidas);
  } catch (e) {
    console.error("vonage", e);
    await enviarUno(usuario, { cuerpo: MENSAJES.error }).catch(() => {});
  }
}
