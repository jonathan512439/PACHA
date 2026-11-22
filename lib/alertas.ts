import "server-only";
import { AvisoGemini, construirMensajeAlerta, guionAudioAlerta, type Canal, type SalidaBot } from "@/contratos/tipos";
import { sintetizarVoz } from "@/lib/gemini";
import { db } from "@/lib/supabase";
import { mensajeDeAlerta } from "@/lib/boletin";
import { CanalSinEnvio, enviarPorCanal } from "@/lib/canales/enviar";

/*
 * Ciclo de una alerta: borrador -> aprobada (una persona) -> enviada. También: descartada.
 * Nada se envía sin estado `aprobada` (regla del contrato y del esquema).
 */

export class ErrorAlerta extends Error {
  constructor(mensaje: string, public status = 409) { super(mensaje); }
}

type Alerta = {
  id: string; status: string; station_id: string; message_text: string; lesson_id: string | null;
  audio_ogg_path: string | null; audio_mp3_path: string | null; bulletin_id: string;
};

async function leerAlerta(id: string): Promise<Alerta> {
  const { data, error } = await db().from("alerts")
    .select("id, status, station_id, message_text, lesson_id, audio_ogg_path, audio_mp3_path, bulletin_id").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ErrorAlerta("La alerta no existe", 404);
  return data as Alerta;
}

/**
 * Audio de la alerta: 1 llamada de TTS con guionAudioAlerta, subido como MP3 a audios/alertas/<id>.mp3.
 * Si falla (sin cupo, sin clave, lento), devuelve null y la alerta sale solo con texto: nunca bloquea.
 */
async function generarAudioAlerta(id: string, guion: string): Promise<string | null> {
  try {
    const mp3 = await sintetizarVoz(guion);
    const ruta = `alertas/${id}.mp3`;
    const { error } = await db().storage.from("audios").upload(ruta, mp3, { contentType: "audio/mpeg", upsert: true });
    if (error) throw new Error(`Storage: ${error.message}`);
    return ruta;
  } catch (e) {
    console.error(`alerta ${id}: sin audio (${e instanceof Error ? e.message : String(e)}); sale solo con texto`);
    return null;
  }
}

/**
 * Aprobar: vuelve a armar el mensaje con la tarjeta ACTUAL (puede haberse verificado después de crear la alerta)
 * y exige que esa tarjeta sea publicable. Si la alerta no trae audio, lo genera AHORA (1 llamada de TTS);
 * si falla, sale solo con texto. Registra quién aprobó.
 */
export async function aprobarAlerta(id: string, usuario: string) {
  const a = await leerAlerta(id);
  if (a.status !== "borrador") throw new ErrorAlerta(`Solo se aprueba una alerta en borrador (está en "${a.status}")`);
  const { data: b, error } = await db().from("bulletins").select("extracted, is_example, source_url").eq("id", a.bulletin_id).single();
  if (error) throw new Error(error.message);
  const aviso = AvisoGemini.parse(b.extracted);
  const esEjemplo = b.is_example as boolean;
  const boletinUrl = (b.source_url as string | null) ?? null;
  const m = await mensajeDeAlerta(aviso, esEjemplo, { boletinUrl });
  if (!m.publicable) throw new ErrorAlerta(`Falta la tarjeta ${m.lessonEsperada} verificada: no se puede aprobar todavía`);

  const yaTieneAudio = !!(a.audio_ogg_path || a.audio_mp3_path);
  const mp3Nuevo = yaTieneAudio ? null : await generarAudioAlerta(id, guionAudioAlerta(aviso, m.tarjeta));
  const conAudio = yaTieneAudio || !!mp3Nuevo;
  const texto = construirMensajeAlerta({ aviso, tarjeta: m.tarjeta, boletinEsEjemplo: esEjemplo, boletinUrl, conAudio });

  const upd = await db().from("alerts").update({
    status: "aprobada", approved_by: usuario, approved_at: new Date().toISOString(), message_text: texto, lesson_id: m.lessonId,
    ...(mp3Nuevo ? { audio_mp3_path: mp3Nuevo } : {}),
  }).eq("id", id).eq("status", "borrador").select("id");
  if (upd.error) throw new Error(upd.error.message);
  if (!upd.data?.length) throw new ErrorAlerta("La alerta cambió de estado mientras se aprobaba");
  return { id, status: "aprobada", approved_by: usuario, message_text: texto, audio: conAudio };
}

export async function descartarAlerta(id: string) {
  const upd = await db().from("alerts").update({ status: "descartada" }).eq("id", id).in("status", ["borrador", "aprobada"]).select("id");
  if (upd.error) throw new Error(upd.error.message);
  if (!upd.data?.length) throw new ErrorAlerta("Solo se descarta una alerta en borrador o aprobada");
  return { id, status: "descartada" };
}

const urlAudio = (ruta: string) => db().storage.from("audios").getPublicUrl(ruta).data.publicUrl;

/**
 * Enviar a los suscriptores activos de las comunidades de la estación de la alerta.
 * Se puede volver a llamar: reintenta solo a quienes fallaron (alert_deliveries es único por alerta y persona).
 * El canal web no recibe envíos del sistema (se cuenta aparte).
 */
export async function enviarAlerta(id: string) {
  const a = await leerAlerta(id);
  if (a.status !== "aprobada" && a.status !== "enviada") throw new ErrorAlerta(`Solo se envía una alerta aprobada (está en "${a.status}")`);

  const { data: subs, error } = await db().from("subscribers")
    .select("id, channel, channel_user_id, communities!inner(station_id)")
    .eq("activo", true).eq("estado", "listo").eq("communities.station_id", a.station_id);
  if (error) throw new Error(error.message);
  const { data: previos } = await db().from("alert_deliveries").select("subscriber_id").eq("alert_id", id).eq("status", "enviado");
  const yaEnviados = new Set((previos ?? []).map((p) => p.subscriber_id as string));

  const salidas: SalidaBot[] = [{ tipo: "texto", texto: a.message_text }];
  // Para mensajería, OGG/Opus si existe (audio pregenerado del demo); si no, el MP3 generado al aprobar:
  // WhatsApp (audio/mpeg) y Telegram (sendVoice) también aceptan MP3.
  const audioMensajeria = a.audio_ogg_path ?? a.audio_mp3_path;
  if (audioMensajeria) {
    salidas.push({ tipo: "audio", oggUrl: urlAudio(audioMensajeria), ...(a.audio_mp3_path ? { mp3Url: urlAudio(a.audio_mp3_path) } : {}) });
  }

  const r = { enviados: 0, fallidos: 0, omitidosWeb: 0, yaEnviados: yaEnviados.size, errores: [] as string[] };
  for (const s of (subs ?? []) as { id: string; channel: Canal; channel_user_id: string }[]) {
    if (yaEnviados.has(s.id)) continue;
    let status: "enviado" | "fallido" = "enviado", detalle: string | null = null;
    try {
      await enviarPorCanal(s.channel, s.channel_user_id, salidas);
    } catch (e) {
      if (e instanceof CanalSinEnvio) { r.omitidosWeb++; continue; }
      status = "fallido"; detalle = String(e).slice(0, 500);
    }
    await db().from("alert_deliveries").upsert(
      { alert_id: id, subscriber_id: s.id, channel: s.channel, status, error: detalle, sent_at: new Date().toISOString() },
      { onConflict: "alert_id,subscriber_id" },
    );
    if (status === "enviado") r.enviados++; else { r.fallidos++; if (detalle) r.errores.push(detalle); }
  }
  await db().from("alerts").update({ status: "enviada", sent_at: new Date().toISOString() }).eq("id", id);
  return { id, status: "enviada", ...r };
}
