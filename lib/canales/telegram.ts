import "server-only";
import { timingSafeEqual } from "node:crypto";
import { LIMITES, MENSAJES, type EntradaBot, type SalidaBot } from "@/contratos/tipos";
import { procesarMensaje } from "@/lib/bot/procesar";

/*
 * Adaptador de Telegram (Bot API). Traduce Update -> EntradaBot y SalidaBot[] -> llamadas a la API.
 * La lógica del bot vive en procesarMensaje: aquí solo hay formato de canal.
 * Sin TELEGRAM_BOT_TOKEN en desarrollo, las llamadas se escriben en la consola en vez de enviarse
 * (sirve para probar el webhook sin bot). En producción, sin token, falla.
 */

// ---- Tipos mínimos de la Bot API que usamos -------------------------------
type Chat = { id: number; type: "private" | "group" | "supergroup" | "channel" };
type Archivo = { file_id: string; file_size?: number; duration?: number; mime_type?: string };
type Mensaje = {
  message_id: number; chat: Chat; text?: string;
  voice?: Archivo; audio?: Archivo; photo?: Archivo[]; document?: Archivo; video_note?: Archivo;
};
type CallbackQuery = { id: string; data?: string; message?: { chat: Chat } };
export type Update = { update_id: number; message?: Mensaje; callback_query?: CallbackQuery };

// ---- Seguridad del webhook ------------------------------------------------
/** Compara el header X-Telegram-Bot-Api-Secret-Token con TELEGRAM_WEBHOOK_SECRET en tiempo constante. */
export function secretoValido(recibido: string | null): boolean {
  const esperado = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!esperado || !recibido) return false;
  const a = Buffer.from(recibido), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- Cliente de la Bot API ------------------------------------------------
async function api(metodo: string, cuerpo: Record<string, unknown>): Promise<unknown> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta TELEGRAM_BOT_TOKEN");
    console.log(`[telegram:sin-token] ${metodo} ${JSON.stringify(cuerpo)}`);
    return null;
  }
  const r = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string };
  if (!j.ok) throw new Error(`Telegram ${metodo}: ${j.description ?? r.status}`);
  return j.result;
}

/** Descarga un archivo de Telegram (getFile -> URL de descarga, máx. 20 MB). */
async function descargar(fileId: string): Promise<Buffer> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN para descargar audios");
  const info = (await api("getFile", { file_id: fileId })) as { file_path?: string } | null;
  if (!info?.file_path) throw new Error("Telegram no devolvió file_path");
  const r = await fetch(`https://api.telegram.org/file/bot${token}/${info.file_path}`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Descarga de audio falló: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// ---- Update -> EntradaBot -------------------------------------------------
/** Comandos de Telegram -> palabras clave del bot. */
const COMANDOS: Record<string, string> = { "/start": "0", "/menu": "0", "/baja": "BAJA", "/alerta": "ALERTA" };
const AUDIO_LARGO = `El audio es muy largo. Mándame uno de menos de ${LIMITES.audioMaxSeg} segundos, por favor.`;

type Traduccion = { chatId: number; entrada?: EntradaBot; respuestaDirecta?: string; callbackId?: string } | null;

async function traducir(u: Update): Promise<Traduccion> {
  const mensajeId = `tg:${u.update_id}`; // update_id es único por bot: sirve para deduplicar reintentos

  if (u.callback_query) {
    const chat = u.callback_query.message?.chat;
    if (!chat || chat.type !== "private" || !u.callback_query.data) return null;
    return {
      chatId: chat.id, callbackId: u.callback_query.id,
      entrada: { canal: "telegram", usuarioId: String(chat.id), mensajeId, tipo: "boton", botonId: u.callback_query.data.slice(0, 64) },
    };
  }

  const m = u.message;
  if (!m || m.chat.type !== "private") return null; // solo chats privados: nada de grupos
  const base = { canal: "telegram" as const, usuarioId: String(m.chat.id), mensajeId };

  if (m.text) {
    const comando = COMANDOS[m.text.trim().split(/[\s@]/)[0].toLowerCase()];
    return { chatId: m.chat.id, entrada: { ...base, tipo: "texto", texto: (comando ?? m.text).slice(0, 1000) } };
  }

  const audio = m.voice ?? m.audio; // las videonotas no se procesan
  if (audio) {
    if ((audio.duration ?? 0) > LIMITES.audioMaxSeg) return { chatId: m.chat.id, respuestaDirecta: AUDIO_LARGO };
    const bytes = await descargar(audio.file_id);
    // Las notas de voz de Telegram son OGG/Opus: Gemini las acepta tal cual (prueba del sáb 21/11).
    const mime = audio.mime_type ?? (m.voice ? "audio/ogg" : "audio/mpeg");
    return { chatId: m.chat.id, entrada: { ...base, tipo: "audio", audio: { base64: bytes.toString("base64"), mime } } };
  }

  return { chatId: m.chat.id, respuestaDirecta: MENSAJES.soloAudioTexto }; // fotos, stickers, documentos...
}

// ---- SalidaBot -> Bot API -------------------------------------------------
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const teclado = (filas: { id: string; titulo: string }[]) =>
  ({ inline_keyboard: filas.map((f) => [{ text: f.titulo, callback_data: f.id }]) });

function textoTarjeta(t: Extract<SalidaBot, { tipo: "tarjeta" }>): string {
  return [
    `<b>${html(t.titulo)}</b>`,
    ...t.pasos.map((p, i) => `${i + 1}) ${html(p)}`),
    "",
    `<i>Fuente: ${html(t.fuente)}</i>`, // `fuente` ya trae la página de cada paso
    `<i>${html(t.etiquetaEstado)}</i>`,
    ...(t.fuenteUrl ? [`<a href="${html(t.fuenteUrl)}">Ver documento</a>`] : []),
  ].join("\n");
}

async function enviar(chatId: number, s: SalidaBot): Promise<void> {
  switch (s.tipo) {
    case "texto":
      await api("sendMessage", { chat_id: chatId, text: s.texto });
      return;
    case "botones":
      await api("sendMessage", { chat_id: chatId, text: s.texto, reply_markup: teclado(s.botones) });
      return;
    case "lista":
      await api("sendMessage", { chat_id: chatId, text: s.texto, reply_markup: teclado(s.filas) });
      return;
    case "audio":
      await api("sendVoice", { chat_id: chatId, voice: s.oggUrl });
      return;
    case "tarjeta": {
      const texto = textoTarjeta(s);
      // Con imagen y texto corto: una sola foto con leyenda (límite de 1024 caracteres).
      if (s.imagenUrl && texto.length <= 1024) await api("sendPhoto", { chat_id: chatId, photo: s.imagenUrl, caption: texto, parse_mode: "HTML" });
      else {
        if (s.imagenUrl) await api("sendPhoto", { chat_id: chatId, photo: s.imagenUrl });
        await api("sendMessage", { chat_id: chatId, text: texto, parse_mode: "HTML", link_preview_options: { is_disabled: true } });
      }
      if (s.audioOggUrl) await api("sendVoice", { chat_id: chatId, voice: s.audioOggUrl });
      else if (s.audioMp3Url) await api("sendAudio", { chat_id: chatId, audio: s.audioMp3Url });
      return;
    }
  }
}

/** Envío iniciado por el sistema (alertas, "¿llegó?", aviso a la técnica). Lanza error si Telegram falla. */
export async function enviarSalidasTelegram(chatId: string | number, salidas: SalidaBot[]): Promise<void> {
  for (const s of salidas) await enviar(Number(chatId), s);
}

// ---- Punto de entrada (se llama desde after() en el webhook) --------------
export async function manejarUpdate(u: Update): Promise<void> {
  let chatId: number | null = null;
  try {
    const t = await traducir(u);
    if (!t) return;
    chatId = t.chatId;
    if (t.callbackId) await api("answerCallbackQuery", { callback_query_id: t.callbackId }).catch(() => {}); // quita el "cargando"
    if (t.respuestaDirecta) return void (await api("sendMessage", { chat_id: chatId, text: t.respuestaDirecta }));
    if (!t.entrada) return;
    if (t.entrada.tipo !== "boton") await api("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
    const salidas = await procesarMensaje(t.entrada);
    for (const s of salidas) await enviar(chatId, s); // en orden: Telegram no garantiza orden si van en paralelo
  } catch (e) {
    console.error("telegram", e);
    if (chatId !== null) await api("sendMessage", { chat_id: chatId, text: MENSAJES.error }).catch(() => {});
  }
}
