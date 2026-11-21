import "server-only";
import {
  construirMensajeAlerta,
  decidirAlerta,
  rangoFechas,
  tarjetaParaAlerta,
  type AvisoGemini,
  type DecisionAlerta,
} from "@/contratos/tipos";
import { db } from "@/lib/supabase";
import { extraerAviso, GeminiNoDisponible } from "@/lib/gemini";
import { obtenerTarjeta } from "@/lib/tarjetas";
import { permitirBorrador, puedePublicarse } from "@/lib/tarjeta-publica";
import { contactoTecnica, enviarPorCanal } from "@/lib/canales/enviar";
import { urlApp } from "@/lib/url";
export { urlApp };

/*
 * Boletín del Senamhi -> alerta en BORRADOR (nunca se envía sola: la aprueba una persona).
 *   1. buscarBoletinNuevo(): lee la página de boletines decenales y toma el enlace ALTIPLANO más reciente.
 *   2. procesarBoletin(): guarda el PDF, Gemini extrae (AvisoGemini), el CÓDIGO decide (decidirAlerta)
 *      y, si corresponde, crea la alerta con la plantilla y avisa a la técnica.
 * Las alertas de color del Senamhi viven en una app interna sin API documentada: NO se leen aquí.
 */

const PAGINA_DECENALES = "https://senamhi.gob.bo/meteorologia/agromet-decenal";
const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const PDF_MAX_BYTES = 20 * 1024 * 1024;

export type EnlaceBoletin = { url: string; anio: number; mes: number; decena: number; clave: string };

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/**
 * Enlaces a boletines ALTIPLANO de la página del Senamhi.
 * Formato observado (sáb 21/11): .../boletines_decenales/2026/NOVIEMBRE/2 DECENA/1 BOLETíN ALTIPLANO 2026-11-2.pdf
 * (los hrefs traen "https://senamhi.gob.bo/../agromet/...": new URL lo normaliza y codifica espacios y tildes).
 */
export function enlacesAltiplano(html: string): EnlaceBoletin[] {
  const vistos = new Set<string>();
  const salida: EnlaceBoletin[] = [];
  for (const [, crudo] of html.matchAll(/href="([^"]+?\.pdf)"/gi)) {
    const href = crudo.replace(/&amp;/g, "&");
    if (!/ALTIPLANO/i.test(href)) continue;
    const m = sinTildes(decodeURIComponent(href)).match(/BOLETINES_DECENALES\/(\d{4})\/([A-Z]+)\/(\d)\s*DECENA\//);
    if (!m) continue;
    const mes = m[2] === "SETIEMBRE" ? 9 : MESES.indexOf(m[2]) + 1;
    if (mes < 1) continue;
    let url: string;
    try { url = new URL(href, PAGINA_DECENALES).href; } catch { continue; }
    if (vistos.has(url)) continue;
    vistos.add(url);
    const anio = Number(m[1]), decena = Number(m[3]);
    salida.push({ url, anio, mes, decena, clave: `altiplano-${anio}-${String(mes).padStart(2, "0")}-${decena}` });
  }
  return salida;
}

export const masReciente = (enlaces: EnlaceBoletin[]): EnlaceBoletin | null =>
  enlaces.reduce<EnlaceBoletin | null>((max, e) =>
    !max || e.anio * 1000 + e.mes * 10 + e.decena > max.anio * 1000 + max.mes * 10 + max.decena ? e : max, null);

/** El boletín ALTIPLANO más reciente publicado, o null si la página no tiene ninguno reconocible. */
export async function ultimoBoletinPublicado(): Promise<EnlaceBoletin | null> {
  const r = await fetch(PAGINA_DECENALES, { headers: { "user-agent": "PACHA-bot/1.0" }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Senamhi respondió HTTP ${r.status}`);
  return masReciente(enlacesAltiplano(await r.text()));
}

export async function descargarPdf(url: string): Promise<Uint8Array> {
  const r = await fetch(url, { headers: { "user-agent": "PACHA-bot/1.0" }, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`Descarga del boletín falló: HTTP ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > PDF_MAX_BYTES) throw new Error("El PDF supera 20 MB");
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") throw new Error("El archivo descargado no es un PDF");
  return bytes;
}


const hoy = () => new Date().toISOString().slice(0, 10);

/** Estación de la alerta: el boletín habla por zona; hoy solo cubrimos Oruro (Altiplano Central). */
const estacionDe = (): string => "oruro-ciudad";

/** ¿Hay audio pregenerado para la alerta de este boletín? (bucket 'audios', carpeta alertas/<clave>.ogg|mp3) */
async function audiosPregenerados(clave: string): Promise<{ ogg: string | null; mp3: string | null }> {
  const { data } = await db().storage.from("audios").list("alertas", { search: clave });
  const nombres = new Set((data ?? []).map((f) => f.name));
  return { ogg: nombres.has(`${clave}.ogg`) ? `alertas/${clave}.ogg` : null, mp3: nombres.has(`${clave}.mp3`) ? `alertas/${clave}.mp3` : null };
}

/** Mensaje de la alerta con la tarjeta de la regla, si ya es publicable. */
export async function mensajeDeAlerta(aviso: AvisoGemini, esEjemplo: boolean) {
  if (aviso.fenomeno === "ninguno") throw new Error("Sin fenómeno no hay alerta");
  const lessonId = tarjetaParaAlerta(aviso.fenomeno);
  const tarjeta = await obtenerTarjeta(lessonId);
  const publicable = !!tarjeta && puedePublicarse(tarjeta, permitirBorrador());
  return {
    texto: construirMensajeAlerta({ aviso, tarjeta: publicable ? tarjeta : null, boletinEsEjemplo: esEjemplo }),
    lessonId: tarjeta ? lessonId : null, // la FK exige que exista
    publicable,
    lessonEsperada: lessonId,
  };
}

export type ResultadoBoletin =
  | { estado: "sin_novedad"; clave: string }
  | { estado: "error"; boletinId: string | null; error: string }
  | { estado: "sin_alerta"; boletinId: string; decision: DecisionAlerta; origen: string }
  | { estado: "alerta_creada"; boletinId: string; alertaId: string; decision: DecisionAlerta; origen: string; tecnicaNotificada: boolean; tarjetaLista: boolean };

/** Pipeline completo de un PDF ya descargado (también para la subida manual). */
export async function procesarBoletin(p: { pdf: Uint8Array; sourceUrl: string | null; clave: string; esEjemplo: boolean }): Promise<ResultadoBoletin> {
  const ruta = `${p.clave}.pdf`;
  const sub = await db().storage.from("boletines").upload(ruta, p.pdf, { contentType: "application/pdf", upsert: true });
  if (sub.error) return { estado: "error", boletinId: null, error: `Storage: ${sub.error.message}` };

  const ins = await db().from("bulletins")
    .insert({ region: "altiplano", source_url: p.sourceUrl, pdf_path: ruta, status: "descargado", is_example: p.esEjemplo })
    .select("id").single();
  if (ins.error?.code === "23505") return { estado: "sin_novedad", clave: p.clave }; // otro proceso lo tomó
  if (ins.error) return { estado: "error", boletinId: null, error: ins.error.message };
  const boletinId = ins.data.id as string;

  let aviso: AvisoGemini, origen: string;
  try {
    const r = await extraerAviso(p.pdf);
    aviso = r.datos; origen = r.origen;
  } catch (e) {
    const error = e instanceof GeminiNoDisponible ? e.message : String(e);
    await db().from("bulletins").update({ status: "error", error }).eq("id", boletinId);
    return { estado: "error", boletinId, error };
  }

  await db().from("bulletins").update({
    status: "procesado", extracted: aviso, processed_at: new Date().toISOString(),
    period_start: aviso.periodo_inicio, period_end: aviso.periodo_fin,
  }).eq("id", boletinId);

  const decision = decidirAlerta(aviso);
  if (!decision.alertar || aviso.fenomeno === "ninguno") return { estado: "sin_alerta", boletinId, decision, origen };

  const m = await mensajeDeAlerta(aviso, p.esEjemplo);
  const audios = await audiosPregenerados(p.clave);
  const alerta = await db().from("alerts").insert({
    bulletin_id: boletinId,
    station_id: estacionDe(),
    zona: aviso.zona,
    hazard: aviso.fenomeno,
    risk_level: decision.riesgo,
    senamhi_level: aviso.nivel_senamhi,
    min_temp_c: aviso.temp_minima_c,
    cita_evento: aviso.cita_evento,
    cita_riesgo: aviso.cita_riesgo,
    decision_reason: decision.motivo + (m.publicable ? "" : ` Falta la tarjeta ${m.lessonEsperada} publicable: no se puede aprobar todavía.`),
    valid_from: aviso.periodo_inicio ?? hoy(),
    valid_to: aviso.periodo_fin ?? aviso.periodo_inicio ?? hoy(),
    message_text: m.texto,
    lesson_id: m.lessonId,
    audio_ogg_path: audios.ogg,
    audio_mp3_path: audios.mp3,
    status: "borrador",
  }).select("id").single();
  if (alerta.error) return { estado: "error", boletinId, error: `Alerta: ${alerta.error.message}` };

  // Aviso a la técnica (si falla, la alerta igual queda en el panel).
  let tecnicaNotificada = false;
  const tecnica = contactoTecnica();
  if (tecnica) {
    const periodo = aviso.periodo_inicio && aviso.periodo_fin ? rangoFechas(aviso.periodo_inicio, aviso.periodo_fin) : "sin fecha";
    try {
      await enviarPorCanal(tecnica.canal, tecnica.id, [{ tipo: "texto", texto:
        `Nuevo boletín del Senamhi (${periodo}). ${decision.motivo}\nHay una alerta en borrador para revisar y aprobar: ${urlApp()}/panel/alertas` }]);
      tecnicaNotificada = true;
    } catch (e) { console.error("aviso a la técnica", e); }
  }
  return { estado: "alerta_creada", boletinId, alertaId: alerta.data.id as string, decision, origen, tecnicaNotificada, tarjetaLista: m.publicable };
}

/** Lo que hacen el cron y el botón "Buscar boletín ahora". */
export async function buscarYProcesar(): Promise<ResultadoBoletin & { url?: string }> {
  const ultimo = await ultimoBoletinPublicado();
  if (!ultimo) return { estado: "error", boletinId: null, error: "No se encontró ningún boletín ALTIPLANO en la página del Senamhi (¿cambió el formato?)" };
  const { data: existente } = await db().from("bulletins").select("id").eq("source_url", ultimo.url).maybeSingle();
  if (existente) return { estado: "sin_novedad", clave: ultimo.clave, url: ultimo.url };
  const pdf = await descargarPdf(ultimo.url);
  return { ...(await procesarBoletin({ pdf, sourceUrl: ultimo.url, clave: ultimo.clave, esEjemplo: false })), url: ultimo.url };
}
