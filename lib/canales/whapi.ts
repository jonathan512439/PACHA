import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/supabase";
import { MENSAJES, type EntradaBot, type SalidaBot } from "@/contratos/tipos";
import { procesarMensaje } from "@/lib/bot/procesar";
import { normalizar } from "@/lib/bot/textos";
import { textoTarjeta } from "@/lib/canales/whatsapp";

/*
 * WhatsApp por whapi.cloud, alternativa a la Cloud API de Meta para la demo.
 * whapi vincula un número como dispositivo (igual que WhatsApp Web): no es la API oficial de Meta.
 * - Mismo canal "whatsapp" para el bot: la persona se identifica por su número sin "+" (igual que con Meta).
 * - Sin botones (en whapi son inestables): las opciones van numeradas y la persona responde con el número.
 *   Las opciones del último mensaje se guardan en subscribers.contexto.opcionesWA para traducir "2" -> botón.
 * - Con WHAPI_TOKEN, todos los envíos por WhatsApp (alertas, "¿llegó?", aviso a la técnica) salen por whapi
 *   (lib/canales/enviar.ts).
 * - Sin token en desarrollo, los envíos se escriben en la consola.
 */

const env = (k: string) => process.env[k]?.trim() || undefined;
const AUDIO_MAX_BYTES = 1_000_000;
const AUDIO_LARGO = "El audio es muy largo. Mándame uno de menos de un minuto, por favor.";
const CUERPO_MAX = 4096;
const PIE_MAX = 1024;
const AYUDA_NUMERO = "_Responde con el número._";
const PAUSA_MS = 700; // pausa corta entre mensajes para que lleguen en orden

export type OpcionWA = { id: string; titulo: string };
/** Un mensaje saliente: texto, imagen (con pie opcional) o audio. */
export type MensajeWhapi = { cuerpo?: string; imagen?: string; audio?: string };

export function whapiActivo(): boolean {
  return !!env("WHAPI_TOKEN");
}

// ---- Seguridad ---------------------------------------------------------------
const igual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * whapi no firma los webhooks: se acepta si trae la clave WHAPI_WEBHOOK_SECRET en la cabecera
 * x-pacha-clave (configurada por API) o en la URL (?k=<clave>).
 */
export function webhookWhapiValido(url: URL, cabecera: string | null): boolean {
  const clave = env("WHAPI_WEBHOOK_SECRET");
  if (!clave) return false;
  const recibida = cabecera ?? url.searchParams.get("k");
  return !!recibida && igual(recibida, clave);
}

// ---- Entrada: webhook de whapi -> EntradaBot ---------------------------------
type MediaWhapi = { id?: string; link?: string; mime_type?: string; file_size?: number };
export type MensajeEntranteWhapi = {
  id?: string; from_me?: boolean; type?: string; chat_id?: string; from?: string;
  text?: { body?: string };
  voice?: MediaWhapi; audio?: MediaWhapi; image?: MediaWhapi;
  reply?: { buttons_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
};
export type WebhookWhapi = { messages?: MensajeEntranteWhapi[]; event?: { type?: string; event?: string }; channel_id?: string };

/** Mensajes de personas (no los propios ni los de grupos). */
export function mensajesDeWhapi(w: WebhookWhapi): MensajeEntranteWhapi[] {
  return (w.messages ?? []).filter((m) => !m.from_me && m.id && m.from && !m.chat_id?.endsWith("@g.us") && !m.chat_id?.endsWith("@newsletter"));
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

/** Descarga el audio: por el enlace (con auto_download activado) o por id desde la API. */
async function descargarAudio(media: MediaWhapi): Promise<{ bytes: Buffer; mime: string }> {
  if ((media.file_size ?? 0) > AUDIO_MAX_BYTES) throw new AudioLargo();
  const url = media.link ?? (media.id ? `${API()}/media/${encodeURIComponent(media.id)}` : null);
  if (!url) throw new Error("whapi: el audio no trae enlace ni id");
  let r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (r.status === 401 || r.status === 403) r = await fetch(url, { headers: { authorization: portador() }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`whapi: descarga de audio falló (HTTP ${r.status})`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > AUDIO_MAX_BYTES) throw new AudioLargo();
  const tipo = (media.mime_type ?? r.headers.get("content-type") ?? "").split(";")[0].trim();
  return { bytes, mime: tipo.startsWith("audio/") ? tipo : "audio/ogg" };
}
class AudioLargo extends Error {}

async function traducir(m: MensajeEntranteWhapi, usuario: string): Promise<{ entrada?: EntradaBot; respuestaDirecta?: string }> {
  const base = { canal: "whatsapp" as const, usuarioId: usuario, mensajeId: `wh:${m.id}` };
  if (m.type === "text") {
    const texto = (m.text?.body ?? "").trim();
    if (!texto) return { respuestaDirecta: MENSAJES.soloAudioTexto };
    const boton = opcionElegida(texto, await leerOpciones(usuario));
    if (boton) return { entrada: { ...base, tipo: "boton", botonId: boton } };
    return { entrada: { ...base, tipo: "texto", texto: texto.slice(0, 1000) } };
  }
  if (m.type === "voice" || m.type === "audio") {
    const media = m.voice ?? m.audio;
    if (!media) return { respuestaDirecta: MENSAJES.soloAudioTexto };
    try {
      const { bytes, mime } = await descargarAudio(media);
      return { entrada: { ...base, tipo: "audio", audio: { base64: bytes.toString("base64"), mime } } };
    } catch (e) {
      if (e instanceof AudioLargo) return { respuestaDirecta: AUDIO_LARGO };
      throw e;
    }
  }
  const id = m.reply?.buttons_reply?.id ?? m.reply?.list_reply?.id;
  if (m.type === "reply" && id) return { entrada: { ...base, tipo: "boton", botonId: id.slice(0, 64) } };
  return { respuestaDirecta: MENSAJES.soloAudioTexto }; // imágenes, stickers, ubicación, documentos...
}

// ---- Salida: SalidaBot[] -> mensajes de whapi --------------------------------
/** Arma los mensajes (pura, sin red). Los textos seguidos van juntos en uno: menos mensajes y en orden. */
export function armarMensajes(salidas: SalidaBot[]): { mensajes: MensajeWhapi[]; opciones: OpcionWA[] } {
  const mensajes: MensajeWhapi[] = [];
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
        const audio = s.audioMp3Url ?? s.audioOggUrl;
        if (audio) mensajes.push({ audio });
        break;
      }
    }
  }
  vaciar();
  return { mensajes, opciones };
}

// ---- Cliente de la API de whapi ----------------------------------------------
const portador = () => `Bearer ${env("WHAPI_TOKEN")}`;
const API = () => (env("WHAPI_API_URL") || "https://gate.whapi.cloud").replace(/\/$/, "");
const soloDigitos = (s: string) => s.replace(/\D/g, "");
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ruta y cuerpo de la API para un mensaje. */
export function pedidoWhapi(para: string, m: MensajeWhapi): { ruta: string; cuerpo: Record<string, unknown> } {
  const to = soloDigitos(para);
  if (m.imagen) return { ruta: "/messages/image", cuerpo: { to, media: m.imagen, ...(m.cuerpo ? { caption: m.cuerpo } : {}) } };
  if (m.audio) return { ruta: "/messages/audio", cuerpo: { to, media: m.audio } };
  return { ruta: "/messages/text", cuerpo: { to, body: m.cuerpo ?? "" } };
}

async function enviarUno(para: string, m: MensajeWhapi): Promise<void> {
  const { ruta, cuerpo } = pedidoWhapi(para, m);
  if (!whapiActivo()) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta WHAPI_TOKEN");
    console.log(`[whapi:sin-token] ${ruta} ${JSON.stringify(cuerpo)}`);
    return;
  }
  const r = await fetch(API() + ruta, {
    method: "POST",
    headers: { authorization: portador(), "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: { message?: string } | string; message?: string };
    const detalle = typeof j.error === "string" ? j.error : j.error?.message ?? j.message ?? "";
    // 401 = el número no está vinculado; 402 = se acabó el límite de la prueba (5 chats al mes).
    throw new Error(`whapi ${ruta}: ${r.status} ${detalle}`);
  }
}

/** Envía en orden y recuerda las opciones numeradas. Lanza error si whapi rechaza un mensaje. */
export async function enviarSalidasWhapi(para: string, salidas: SalidaBot[]): Promise<void> {
  const { mensajes, opciones } = armarMensajes(salidas);
  for (const [i, m] of mensajes.entries()) {
    if (i > 0 && whapiActivo()) await esperar(PAUSA_MS);
    await enviarUno(para, m);
  }
  await guardarOpciones(para, opciones).catch((e) => console.error("whapi: guardar opciones", e));
}

// ---- Punto de entrada (se llama desde after() en el webhook) ---------------
export async function manejarMensajeWhapi(m: MensajeEntranteWhapi): Promise<void> {
  const usuario = soloDigitos(m.from ?? "");
  if (!usuario) return;
  try {
    const t = await traducir(m, usuario);
    if (t.respuestaDirecta) return void (await enviarUno(usuario, { cuerpo: t.respuestaDirecta }));
    if (!t.entrada) return;
    const salidas = await procesarMensaje(t.entrada);
    if (salidas.length) await enviarSalidasWhapi(usuario, salidas);
  } catch (e) {
    console.error("whapi", e);
    await enviarUno(usuario, { cuerpo: MENSAJES.error }).catch(() => {});
  }
}
