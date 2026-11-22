import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/supabase";
import { MENSAJES, type EntradaBot, type SalidaBot } from "@/contratos/tipos";
import { procesarMensaje } from "@/lib/bot/procesar";
import { normalizar } from "@/lib/bot/textos";
import { textoTarjeta } from "@/lib/canales/whatsapp";

/*
 * WhatsApp por Twilio (sandbox), alternativa a la Cloud API de Meta para la demo.
 * - Mismo canal "whatsapp" para el bot: la persona se identifica por su número sin "+" (igual que con Meta).
 * - El sandbox no tiene botones: las opciones se muestran numeradas y la persona responde con el número.
 *   Las opciones del último mensaje se guardan en subscribers.contexto.opcionesWA para traducir "2" -> botón.
 * - Si TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_FROM están definidas, los envíos por WhatsApp
 *   (alertas, "¿llegó?", aviso a la técnica) salen por Twilio (lib/canales/enviar.ts).
 * - Sin credenciales en desarrollo, los envíos se escriben en la consola.
 */

const env = (k: string) => process.env[k]?.trim() || undefined;
const AUDIO_MAX_BYTES = 1_000_000;
const AUDIO_LARGO = "El audio es muy largo. Mándame uno de menos de un minuto, por favor.";
/** Límite de Twilio para el cuerpo de un mensaje de WhatsApp; el pie de una imagen es más corto. */
const CUERPO_MAX = 1600;
const PIE_MAX = 1024;
const AYUDA_NUMERO = "_Responde con el número._";

export type OpcionWA = { id: string; titulo: string };
/** Un mensaje de Twilio: texto, imagen o audio (un solo archivo por mensaje). */
export type MensajeTwilio = { cuerpo?: string; media?: string };

export function twilioActivo(): boolean {
  return !!(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_WHATSAPP_FROM"));
}

// ---- Seguridad ---------------------------------------------------------------
/**
 * X-Twilio-Signature = base64(HMAC-SHA1(auth token, URL + cada parámetro POST ordenado por nombre como nombre+valor)).
 * La URL es la configurada en Twilio; TWILIO_WEBHOOK_URL la fija si el host visto por el servidor difiere.
 */
export function firmaTwilioValida(url: string, params: URLSearchParams, cabecera: string | null): boolean {
  const token = env("TWILIO_AUTH_TOKEN");
  if (!token || !cabecera) return false;
  const datos = url + [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => k + v).join("");
  const esperado = Buffer.from(createHmac("sha1", token).update(datos, "utf8").digest("base64"));
  const recibido = Buffer.from(cabecera);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

// ---- Entrada: formulario de Twilio -> EntradaBot ------------------------------
/** "whatsapp:+59171234567" -> "59171234567" (WaId ya viene así). */
export function numeroDe(p: URLSearchParams): string {
  return (p.get("WaId") || p.get("From") || "").replace(/^whatsapp:/, "").replace(/\D/g, "");
}

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

async function descargarAudio(url: string): Promise<{ bytes: Buffer; mime: string }> {
  const r = await fetch(url, { headers: { authorization: autorizacion() }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Twilio: descarga de audio falló (HTTP ${r.status})`);
  if (Number(r.headers.get("content-length") ?? 0) > AUDIO_MAX_BYTES) throw new AudioLargo();
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > AUDIO_MAX_BYTES) throw new AudioLargo();
  return { bytes, mime: (r.headers.get("content-type") ?? "audio/ogg").split(";")[0] };
}
class AudioLargo extends Error {}

async function traducir(p: URLSearchParams, usuario: string): Promise<{ entrada?: EntradaBot; respuestaDirecta?: string }> {
  const base = { canal: "whatsapp" as const, usuarioId: usuario, mensajeId: `tw:${p.get("MessageSid") ?? p.get("SmsMessageSid")}` };
  const nMedia = Number(p.get("NumMedia") ?? 0);
  if (nMedia > 0) {
    const tipo = p.get("MediaContentType0") ?? "";
    const url = p.get("MediaUrl0");
    if (!tipo.startsWith("audio/") || !url) return { respuestaDirecta: MENSAJES.soloAudioTexto };
    try {
      const { bytes, mime } = await descargarAudio(url);
      return { entrada: { ...base, tipo: "audio", audio: { base64: bytes.toString("base64"), mime } } };
    } catch (e) {
      if (e instanceof AudioLargo) return { respuestaDirecta: AUDIO_LARGO };
      throw e;
    }
  }
  const payload = p.get("ButtonPayload");
  if (payload) return { entrada: { ...base, tipo: "boton", botonId: payload.slice(0, 64) } };
  const cuerpo = (p.get("Body") ?? "").trim();
  if (!cuerpo) return { respuestaDirecta: MENSAJES.soloAudioTexto };
  const boton = opcionElegida(cuerpo, await leerOpciones(usuario));
  if (boton) return { entrada: { ...base, tipo: "boton", botonId: boton } };
  return { entrada: { ...base, tipo: "texto", texto: cuerpo.slice(0, 1000) } };
}

// ---- Salida: SalidaBot[] -> mensajes de Twilio --------------------------------
/**
 * Arma los mensajes (pura, sin red). Los textos seguidos van juntos en un mensaje para gastar menos
 * (la cuenta de prueba de Twilio tiene tope diario) y para que no lleguen desordenados.
 */
export function armarMensajes(salidas: SalidaBot[]): { mensajes: MensajeTwilio[]; opciones: OpcionWA[] } {
  const mensajes: MensajeTwilio[] = [];
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
      case "audio": vaciar(); mensajes.push({ media: s.mp3Url ?? s.oggUrl }); break;
      case "tarjeta": {
        vaciar();
        const texto = textoTarjeta(s);
        if (s.imagenUrl && texto.length <= PIE_MAX) mensajes.push({ cuerpo: texto, media: s.imagenUrl });
        else {
          if (s.imagenUrl) mensajes.push({ media: s.imagenUrl });
          mensajes.push({ cuerpo: texto.slice(0, CUERPO_MAX) });
        }
        const audio = s.audioMp3Url ?? s.audioOggUrl; // MP3 es el formato de audio más compatible en Twilio
        if (audio) mensajes.push({ media: audio });
        break;
      }
    }
  }
  vaciar();
  return { mensajes, opciones };
}

// ---- Cliente de la API de Twilio ---------------------------------------------
const autorizacion = () => "Basic " + Buffer.from(`${env("TWILIO_ACCOUNT_SID")}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64");
const API = () => `https://api.twilio.com/2010-04-01/Accounts/${env("TWILIO_ACCOUNT_SID")}`;
const remitente = () => "whatsapp:+" + (env("TWILIO_WHATSAPP_FROM") ?? "").replace(/\D/g, "");
const ESTADOS_SALIDOS = new Set(["sent", "delivered", "read", "failed", "undelivered"]);
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function enviarUno(para: string, m: MensajeTwilio): Promise<string | null> {
  if (!twilioActivo()) {
    if (process.env.NODE_ENV === "production") throw new Error("Faltan las credenciales de Twilio");
    console.log(`[twilio:sin-credenciales] ${JSON.stringify({ para, ...m })}`);
    return null;
  }
  const form = new URLSearchParams({ From: remitente(), To: `whatsapp:+${para.replace(/\D/g, "")}` });
  if (m.cuerpo) form.set("Body", m.cuerpo);
  if (m.media) form.set("MediaUrl", m.media);
  const r = await fetch(`${API()}/Messages.json`, {
    method: "POST",
    headers: { authorization: autorizacion(), "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await r.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
  // 63015 = la persona no se unió al sandbox ("join <palabra>"); 63016 = fuera de la ventana de 24 h.
  if (!r.ok) throw new Error(`Twilio: ${j.code ?? r.status} ${j.message ?? ""}`);
  return j.sid ?? null;
}

/** Espera (máx. ~5 s) a que Twilio entregue el mensaje a WhatsApp: si no, una imagen puede llegar después del texto siguiente. */
async function esperarSalida(sid: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await esperar(500);
    const r = await fetch(`${API()}/Messages/${sid}.json`, { headers: { authorization: autorizacion() }, signal: AbortSignal.timeout(5_000) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { status?: string; error_code?: number | null } | undefined;
    if (j?.status && ESTADOS_SALIDOS.has(j.status)) {
      if (j.status === "failed" || j.status === "undelivered") console.error(`Twilio: mensaje ${sid} no entregado (${j.error_code ?? "?"})`);
      return;
    }
  }
}

/** Envía en orden y recuerda las opciones numeradas. Lanza error si Twilio rechaza un mensaje. */
export async function enviarSalidasTwilio(para: string, salidas: SalidaBot[]): Promise<void> {
  const { mensajes, opciones } = armarMensajes(salidas);
  for (const [i, m] of mensajes.entries()) {
    const sid = await enviarUno(para, m);
    if (sid && i < mensajes.length - 1) await esperarSalida(sid);
  }
  await guardarOpciones(para, opciones).catch((e) => console.error("twilio: guardar opciones", e));
}

// ---- Punto de entrada (se llama desde after() en el webhook) ---------------
export async function manejarMensajeTwilio(p: URLSearchParams): Promise<void> {
  const usuario = numeroDe(p);
  if (!usuario) return;
  try {
    const t = await traducir(p, usuario);
    if (t.respuestaDirecta) return void (await enviarUno(usuario, { cuerpo: t.respuestaDirecta }));
    if (!t.entrada) return;
    const salidas = await procesarMensaje(t.entrada);
    if (salidas.length) await enviarSalidasTwilio(usuario, salidas);
  } catch (e) {
    console.error("twilio", e);
    await enviarUno(usuario, { cuerpo: MENSAJES.error }).catch(() => {});
  }
}
