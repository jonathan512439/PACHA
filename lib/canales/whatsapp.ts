import "server-only";
import { db } from "@/lib/supabase";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MENSAJES, type EntradaBot, type SalidaBot } from "@/contratos/tipos";
import { procesarMensaje } from "@/lib/bot/procesar";

/*
 * Adaptador de WhatsApp Cloud API. Traduce el webhook -> EntradaBot y SalidaBot[] -> mensajes de Graph API.
 * La lógica del bot vive en procesarMensaje: aquí solo hay formato de canal.
 * Las respuestas van DENTRO de la ventana de 24 h (la persona acaba de escribir), así que no necesitan plantilla.
 * Sin WHATSAPP_TOKEN en desarrollo, las llamadas se escriben en la consola en vez de enviarse.
 */

// Las variables se leen sin espacios ni saltos de línea: al pegarlas en Vercel es fácil que se cuele uno
// y una comparación exacta haría que el bot ignore todos los mensajes (pasó el sáb 21/11).
const env = (k: string) => process.env[k]?.trim() || undefined;
const VERSION = () => env("WHATSAPP_GRAPH_VERSION") || "v23.0";
const GRAPH = () => `https://graph.facebook.com/${VERSION()}`;
/** ~1 MB de nota de voz Opus ≈ varios minutos; por encima se pide un audio más corto (el webhook no trae duración). */
const AUDIO_MAX_BYTES = 1_000_000;
const AUDIO_LARGO = "El audio es muy largo. Mándame uno de menos de un minuto, por favor.";

// ---- Tipos mínimos del webhook ---------------------------------------------
type MensajeWA = {
  from: string; id: string; type: string;
  text?: { body: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  interactive?: { type: "button_reply" | "list_reply"; button_reply?: { id: string }; list_reply?: { id: string } };
  button?: { payload?: string; text?: string }; // respuesta rápida de una plantilla
};
export type EstadoWA = {
  id?: string; status?: string; recipient_id?: string; timestamp?: string;
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
};
export type WebhookWA = {
  object?: string;
  entry?: { changes?: { field?: string; value?: { metadata?: { phone_number_id?: string }; messages?: MensajeWA[]; statuses?: EstadoWA[] } }[] }[];
};

/** Estados "failed" del payload (Meta aceptó el mensaje pero no lo entregó): sin esto el motivo se perdía. */
export function fallosDelWebhook(w: WebhookWA): EstadoWA[] {
  if (w.object !== "whatsapp_business_account") return [];
  const propio = env("WHATSAPP_PHONE_NUMBER_ID");
  return (w.entry ?? []).flatMap((e) => e.changes ?? [])
    .filter((c) => c.field === "messages" && (!propio || c.value?.metadata?.phone_number_id === propio))
    .flatMap((c) => c.value?.statuses ?? [])
    .filter((s) => s.status === "failed");
}

/** Guarda el último fallo de entrega en el contexto de la persona (y en el log), para diagnosticar sin acceso a Vercel. */
export async function registrarFalloEntrega(s: EstadoWA): Promise<void> {
  const e = s.errors?.[0];
  const fallo = { code: e?.code ?? null, title: e?.title ?? null, detalle: e?.error_data?.details ?? e?.message ?? null, en: new Date().toISOString() };
  console.error(`WhatsApp: mensaje no entregado (${fallo.code}) ${fallo.title ?? ""} ${fallo.detalle ?? ""}`);
  if (!s.recipient_id) return;
  const { data } = await db().from("subscribers").select("id, contexto").eq("channel", "whatsapp").eq("channel_user_id", s.recipient_id).maybeSingle();
  if (!data) return;
  await db().from("subscribers").update({ contexto: { ...(data.contexto ?? {}), ultimoFalloEntrega: fallo } }).eq("id", data.id);
}

// ---- Seguridad ---------------------------------------------------------------
/** Verificación del webhook (GET): Meta envía hub.verify_token y espera hub.challenge de vuelta. */
export function verificarSuscripcion(params: URLSearchParams): string | null {
  const esperado = env("WHATSAPP_VERIFY_TOKEN");
  return esperado && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === esperado
    ? params.get("hub.challenge") : null;
}

/** X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(app secret, cuerpo CRUDO). Comparación en tiempo constante. */
export function firmaValida(cuerpoCrudo: string, cabecera: string | null): boolean {
  const secreto = env("WHATSAPP_APP_SECRET");
  if (!secreto || !cabecera?.startsWith("sha256=")) return false;
  const esperado = Buffer.from(createHmac("sha256", secreto).update(cuerpoCrudo, "utf8").digest("hex"));
  const recibido = Buffer.from(cabecera.slice(7));
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

// ---- Cliente de Graph API -------------------------------------------------
async function graph(ruta: string, cuerpo?: Record<string, unknown>): Promise<unknown> {
  const token = env("WHATSAPP_TOKEN");
  if (!token) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta WHATSAPP_TOKEN");
    console.log(`[whatsapp:sin-token] ${ruta} ${cuerpo ? JSON.stringify(cuerpo) : ""}`);
    return null;
  }
  const r = await fetch(`${GRAPH()}/${ruta}`, {
    method: cuerpo ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, ...(cuerpo ? { "content-type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: { message?: string; code?: number } };
  // 131030 = el número no está en la lista de destinatarios del número de prueba (máx. 5).
  if (!r.ok || j.error) throw new Error(`WhatsApp ${ruta}: ${j.error?.code ?? r.status} ${j.error?.message ?? ""}`);
  return j;
}

/** Descarga un audio: GET /{media-id} da una URL temporal que también exige el token. */
async function descargarMedia(mediaId: string): Promise<{ bytes: Buffer; mime: string }> {
  const token = env("WHATSAPP_TOKEN");
  if (!token) throw new Error("Falta WHATSAPP_TOKEN para descargar audios");
  const info = (await graph(mediaId)) as { url?: string; mime_type?: string; file_size?: number };
  if (!info?.url) throw new Error("WhatsApp no devolvió la URL del audio");
  if ((info.file_size ?? 0) > AUDIO_MAX_BYTES) throw new AudioLargo();
  const r = await fetch(info.url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Descarga de audio falló: HTTP ${r.status}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > AUDIO_MAX_BYTES) throw new AudioLargo();
  return { bytes, mime: (info.mime_type ?? "audio/ogg").split(";")[0] };
}
class AudioLargo extends Error {}

const enviarA = (para: string, cuerpo: Record<string, unknown>) =>
  graph(`${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`, { messaging_product: "whatsapp", recipient_type: "individual", to: para, ...cuerpo });

// ---- Webhook -> EntradaBot ---------------------------------------------------
/** Extrae los mensajes del payload, solo del número configurado (ignora estados de entrega y otros números). */
export function mensajesDelWebhook(w: WebhookWA): MensajeWA[] {
  if (w.object !== "whatsapp_business_account") return [];
  const propio = env("WHATSAPP_PHONE_NUMBER_ID");
  return (w.entry ?? []).flatMap((e) => e.changes ?? [])
    .filter((c) => c.field === "messages" && (!propio || c.value?.metadata?.phone_number_id === propio))
    .flatMap((c) => c.value?.messages ?? []);
}

async function traducir(m: MensajeWA): Promise<{ entrada?: EntradaBot; respuestaDirecta?: string }> {
  const base = { canal: "whatsapp" as const, usuarioId: m.from, mensajeId: `wa:${m.id}` };
  if (m.type === "text" && m.text?.body) return { entrada: { ...base, tipo: "texto", texto: m.text.body.slice(0, 1000) } };
  if (m.type === "interactive") {
    const id = m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id;
    if (id) return { entrada: { ...base, tipo: "boton", botonId: id.slice(0, 64) } };
  }
  if (m.type === "button" && m.button?.payload) return { entrada: { ...base, tipo: "boton", botonId: m.button.payload.slice(0, 64) } };
  if (m.type === "button" && m.button?.text) return { entrada: { ...base, tipo: "texto", texto: m.button.text.slice(0, 1000) } };
  if (m.type === "audio" && m.audio?.id) {
    try {
      const { bytes, mime } = await descargarMedia(m.audio.id);
      // Las notas de voz de WhatsApp son OGG/Opus: Gemini las acepta tal cual (prueba del sáb 21/11).
      return { entrada: { ...base, tipo: "audio", audio: { base64: bytes.toString("base64"), mime } } };
    } catch (e) {
      if (e instanceof AudioLargo) return { respuestaDirecta: AUDIO_LARGO };
      throw e;
    }
  }
  return { respuestaDirecta: MENSAJES.soloAudioTexto }; // imágenes, stickers, ubicación, documentos...
}

// ---- SalidaBot -> Graph API -------------------------------------------------
export function textoTarjeta(t: Extract<SalidaBot, { tipo: "tarjeta" }>): string {
  return [
    `*${t.titulo}*`,
    ...t.pasos.map((p, i) => `${i + 1}) ${p}`),
    "",
    `_Fuente: ${t.fuente}_`, // `fuente` ya trae la página de cada paso
    `_${t.etiquetaEstado}_`,
    ...(t.fuenteUrl ? [t.fuenteUrl] : []),
    ...(t.urlCompleta ? [`Ver tarjeta completa: ${t.urlCompleta}`] : []),
  ].join("\n");
}

async function enviar(para: string, s: SalidaBot): Promise<void> {
  switch (s.tipo) {
    case "texto":
      await enviarA(para, { type: "text", text: { body: s.texto, preview_url: false } });
      return;
    case "botones":
      await enviarA(para, { type: "interactive", interactive: {
        type: "button", body: { text: s.texto },
        action: { buttons: s.botones.map((b) => ({ type: "reply", reply: { id: b.id, title: b.titulo } })) },
      } });
      return;
    case "lista":
      await enviarA(para, { type: "interactive", interactive: {
        type: "list", body: { text: s.texto },
        action: { button: s.boton, sections: [{ title: "Opciones", rows: s.filas.map((f) => ({ id: f.id, title: f.titulo, ...(f.descripcion ? { description: f.descripcion } : {}) })) }] },
      } });
      return;
    case "audio":
      // Sin el indicador de nota de voz: llega como audio (ícono de música). Se reproduce igual.
      await enviarA(para, { type: "audio", audio: { link: s.oggUrl } });
      return;
    case "tarjeta": {
      const texto = textoTarjeta(s);
      if (s.imagenUrl && texto.length <= 1024) await enviarA(para, { type: "image", image: { link: s.imagenUrl, caption: texto } });
      else {
        if (s.imagenUrl) await enviarA(para, { type: "image", image: { link: s.imagenUrl } });
        await enviarA(para, { type: "text", text: { body: texto, preview_url: false } });
      }
      const audio = s.audioOggUrl ?? s.audioMp3Url;
      if (audio) await enviarA(para, { type: "audio", audio: { link: audio } });
      return;
    }
  }
}

/**
 * Envío iniciado por el sistema (alertas, "¿llegó?", aviso a la técnica). Lanza error si WhatsApp falla.
 * Fuera de la ventana de 24 h WhatsApp lo rechaza (hace falta plantilla): por eso en el demo se escribe "ALERTA" antes.
 */
export async function enviarSalidasWhatsApp(para: string, salidas: SalidaBot[]): Promise<void> {
  for (const s of salidas) await enviar(para, s);
}

// ---- Punto de entrada (se llama desde after() en el webhook) ---------------
export async function manejarMensaje(m: MensajeWA): Promise<void> {
  try {
    // Marca como leído y muestra "escribiendo…" mientras se procesa (si falla, no importa).
    await graph(`${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`, {
      messaging_product: "whatsapp", status: "read", message_id: m.id, typing_indicator: { type: "text" },
    }).catch(() => {});
    const t = await traducir(m);
    if (t.respuestaDirecta) return void (await enviarA(m.from, { type: "text", text: { body: t.respuestaDirecta } }));
    if (!t.entrada) return;
    const salidas = await procesarMensaje(t.entrada);
    for (const s of salidas) await enviar(m.from, s); // en orden
  } catch (e) {
    console.error("whatsapp", e);
    await enviarA(m.from, { type: "text", text: { body: MENSAJES.error } }).catch(() => {});
  }
}
