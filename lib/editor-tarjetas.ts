import "server-only";
// Editor de tarjetas y fuentes (opción 2): datos en Supabase (lesson_versions, sources, lessons).
// Flujo: un editor guarda una VERSIÓN en borrador → otra persona la coteja y la publica (o la devuelve).
// La versión vigente sigue en `lessons` (y se sigue enviando) hasta que se publica la nueva.
// Requiere la migración contratos/migraciones/2026-11-22_editor_tarjetas.sql.
import { db } from "@/lib/supabase";
import { FUENTES, type Fuente } from "@/lib/fuentes";
import { sintetizarVoz } from "@/lib/gemini";
import { obtenerTarjeta } from "@/lib/tarjetas";
import { validarFoto } from "@/lib/storage/foto";
import { BUCKET_AUDIOS, BUCKET_IMAGENES, huellaVerificacion, rutaAudioTarjeta } from "@/lib/tarjeta-publica";
import {
  contenidoDeTarjeta,
  guionAudioTarjeta,
  huellaDeContenido,
  mismasImagenes,
  validarContenido,
  type ContenidoTarjeta,
} from "@/lib/editor-tarjetas-contenido";

export class ErrorEditor extends Error {}

export type EstadoVersion = "borrador" | "publicada" | "devuelta" | "descartada" | "retiro";
export type Version = {
  id: string; lesson_id: string; contenido: ContenidoTarjeta; estado: EstadoVersion; motivo: string; huella: string;
  created_by: string; created_at: string; verified_by: string | null; verified_at: string | null; observacion: string | null;
};

/** true si la migración del editor está aplicada (si no, el panel lo avisa en vez de fallar). */
export async function editorDisponible(): Promise<boolean> {
  const { error } = await db().from("lesson_versions").select("id").limit(1);
  return !error;
}

/** Fuentes: las de data/fuentes.json más las registradas en el panel (tabla sources). */
export async function fuentesRegistradas(): Promise<Fuente[]> {
  const { data, error } = await db().from("sources").select("*").order("created_at");
  if (error) return [...FUENTES];
  const deBase: Fuente[] = (data ?? []).map((f) => ({
    id: f.id as string, institucion: f.institucion as string, titulo: f.titulo as string, anio: f.anio as number,
    url: f.url as string, claves: f.claves as string[], tarjetas: [], consultado: String(f.consultado),
    nota: [f.nota as string | null, f.reemplazada_por ? `Reemplazada por ${f.reemplazada_por}.` : null, `Registrada por ${f.created_by}.`]
      .filter(Boolean).join(" "),
  }));
  return [...FUENTES, ...deBase.filter((f) => !FUENTES.some((x) => x.id === f.id))];
}

export async function listarVersiones(estados: EstadoVersion[]): Promise<Version[]> {
  const { data, error } = await db().from("lesson_versions").select("*").in("estado", estados).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Version[];
}

export async function obtenerVersion(id: string): Promise<Version | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("lesson_versions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Version | null) ?? null;
}

export async function historial(lessonId: string): Promise<Version[]> {
  const { data, error } = await db().from("lesson_versions").select("*").eq("lesson_id", lessonId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Version[];
}

/** Imágenes nuevas elegidas en el editor (ya re-codificadas en el navegador), alineadas con los pasos. */
export type ImagenesNuevas = { encabezado: Uint8Array | null; pasos: (Uint8Array | null)[] };
const EXT_IMAGEN: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Sube las imágenes nuevas al bucket 'tarjetas' con un nombre ÚNICO (lessons/<id>/<sello>-header.webp…):
 * nunca pisa las de la versión publicada, que se sigue mostrando hasta que se verifique esta.
 */
async function subirImagenes(c: ContenidoTarjeta, imagenes: ImagenesNuevas): Promise<ContenidoTarjeta> {
  const lista = [
    ...(imagenes.encabezado ? [{ bytes: imagenes.encabezado, nombre: "header", que: "La imagen del encabezado" }] : []),
    ...imagenes.pasos.flatMap((b, i) => (b ? [{ bytes: b, nombre: `paso${i + 1}`, que: `La imagen del paso ${i + 1}` }] : [])),
  ];
  if (!lista.length) return c;
  // Primero se validan TODAS (formato real, ≤ 5 MB, sin EXIF); recién entonces se sube algo.
  const validadas = lista.map((x) => {
    try { return { ...x, mime: validarFoto(Buffer.from(x.bytes), x.que) }; }
    catch (e) { throw new ErrorEditor(e instanceof Error ? e.message : String(e)); }
  });
  const sello = Date.now().toString(36);
  const rutas: Record<string, string> = {};
  for (const x of validadas) {
    const ruta = `lessons/${c.id}/${sello}-${x.nombre}.${EXT_IMAGEN[x.mime]}`;
    const { error } = await db().storage.from(BUCKET_IMAGENES).upload(ruta, x.bytes, { contentType: x.mime, cacheControl: "3600" });
    if (error) throw new Error(`No se pudo subir ${x.que.toLowerCase()}: ${error.message}`);
    rutas[x.nombre] = ruta;
  }
  return {
    ...c,
    header_image_path: rutas.header ?? c.header_image_path ?? null,
    step_image_paths: c.steps.map((_, i) => rutas[`paso${i + 1}`] ?? c.step_image_paths?.[i] ?? null),
  };
}

/** Guarda una versión en borrador (con sus imágenes nuevas, si hay). Valida con las mismas reglas que el seed. Devuelve su id. */
export async function crearVersion(
  contenido: ContenidoTarjeta,
  motivo: string,
  usuario: string,
  imagenes: ImagenesNuevas = { encabezado: null, pasos: [] },
): Promise<string> {
  if (motivo.trim().length < 5) throw new ErrorEditor("Escribe el motivo del cambio (para el historial).");
  const problemas = validarContenido(contenido, await fuentesRegistradas());
  if (problemas.length) throw new ErrorEditor(`No se guardó. Corrige: ${problemas.join(" · ")}`);
  const vigente = await obtenerTarjeta(contenido.id);
  const imagenesNuevas = !!imagenes.encabezado || imagenes.pasos.some(Boolean);
  if (
    vigente && vigente.status !== "borrador" && !imagenesNuevas &&
    huellaVerificacion(vigente) === huellaDeContenido(contenido) && mismasImagenes(contenido, vigente)
  ) {
    throw new ErrorEditor("No hay cambios respecto de la versión publicada.");
  }
  const final = await subirImagenes(contenido, imagenes);
  const { data, error } = await db().from("lesson_versions").insert({
    lesson_id: final.id, contenido: final, estado: "borrador", motivo: motivo.trim(), huella: huellaDeContenido(final), created_by: usuario,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Audio MP3 de la versión publicada (1 llamada de TTS). Si falla, la tarjeta sale sin audio: nunca bloquea. */
async function audioDe(c: ContenidoTarjeta): Promise<string | null> {
  try {
    const mp3 = await sintetizarVoz(guionAudioTarjeta(c));
    const ruta = rutaAudioTarjeta(c, "mp3");
    const { error } = await db().storage.from(BUCKET_AUDIOS).upload(ruta, mp3, { contentType: "audio/mpeg", upsert: true });
    if (error) throw new Error(error.message);
    return ruta;
  } catch (e) {
    console.error(`tarjeta ${c.id}: sin audio (${e instanceof Error ? e.message : String(e)})`);
    return null;
  }
}

/**
 * Verificar y publicar: otra persona (nunca quien la redactó) confirma que cada paso está en la página citada.
 * La versión reemplaza a la vigente en `lessons` (estado verificada, con quién verificó) y se genera su audio.
 */
export async function publicarVersion(id: string, usuario: string, observacion: string): Promise<{ lessonId: string; audio: boolean }> {
  const v = await obtenerVersion(id);
  if (!v) throw new ErrorEditor("La versión no existe.");
  if (v.estado !== "borrador") throw new ErrorEditor(`Esta versión ya está "${v.estado}".`);
  if (v.created_by === usuario) throw new ErrorEditor("Quien redacta una versión no puede verificarla: tiene que hacerlo otra persona.");
  const problemas = validarContenido(v.contenido, await fuentesRegistradas());
  if (problemas.length) throw new ErrorEditor(`No se puede publicar: ${problemas.join(" · ")}`);

  const c = v.contenido;
  const vigente = await obtenerTarjeta(c.id);
  // Las imágenes de la versión mandan (así se puede QUITAR una). Solo si la versión no trae el campo (formato viejo)
  // se conservan las de la vigente.
  const imagenes = ("step_image_paths" in c ? c.step_image_paths ?? [] : vigente?.step_image_paths ?? []).slice(0, c.steps.length);
  const encabezado = "header_image_path" in c ? c.header_image_path ?? null : vigente?.header_image_path ?? null;
  const audioMp3 = await audioDe(c);
  const fila = {
    id: c.id, hazard: c.hazard, phase: c.phase, title: c.title, steps: c.steps, step_sources: c.step_sources,
    por_que: c.por_que ?? null, evitar: c.evitar ?? null, pedir_ayuda: c.pedir_ayuda ?? null,
    factor_tags: c.factor_tags, source_doc: c.source_doc, source_page: c.source_page, source_url: c.source_url ?? null,
    author: c.author, status: "verificada", verified_by: usuario, reviewed_by: null,
    header_image_path: encabezado,
    step_image_paths: imagenes,
    // El PNG y el OGG viejos dicen otro texto: se descartan (el bot ya no los adjuntaría).
    card_image_path: null, audio_ogg_path: null, audio_mp3_path: audioMp3,
  };
  const { error } = await db().from("lessons").upsert(fila, { onConflict: "id" });
  if (error) throw new Error(`No se pudo publicar: ${error.message}`);

  const upd = await db().from("lesson_versions").update({
    estado: "publicada", verified_by: usuario, verified_at: new Date().toISOString(), observacion: observacion.trim() || null,
  }).eq("id", id).eq("estado", "borrador");
  if (upd.error) throw new Error(upd.error.message);
  return { lessonId: c.id, audio: !!audioMp3 };
}

/** Devolver al editor con una observación (la versión vigente sigue igual). */
export async function devolverVersion(id: string, usuario: string, observacion: string): Promise<void> {
  if (observacion.trim().length < 5) throw new ErrorEditor("Escribe qué hay que corregir.");
  const v = await obtenerVersion(id);
  if (!v || v.estado !== "borrador") throw new ErrorEditor("Solo se devuelve una versión en borrador.");
  const { error } = await db().from("lesson_versions").update({ estado: "devuelta", observacion: `${usuario}: ${observacion.trim()}` }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Retirar: la tarjeta deja de publicarse (vuelve a borrador) y queda en el historial con el motivo. No se borra nada. */
export async function retirarTarjeta(lessonId: string, usuario: string, motivo: string): Promise<void> {
  if (motivo.trim().length < 5) throw new ErrorEditor("Escribe el motivo del retiro.");
  const t = await obtenerTarjeta(lessonId);
  if (!t) throw new ErrorEditor("La tarjeta no existe.");
  if (t.status === "borrador") throw new ErrorEditor("La tarjeta ya no está publicada.");
  const { error } = await db().from("lessons").update({ status: "borrador", verified_by: null, reviewed_by: null }).eq("id", lessonId);
  if (error) throw new Error(error.message);
  const contenido = contenidoDeTarjeta(t);
  await db().from("lesson_versions").insert({
    lesson_id: lessonId, contenido, estado: "retiro", motivo: motivo.trim(), huella: huellaVerificacion(t), created_by: usuario,
  });
}

/** Registrar una fuente nueva. Sin un enlace https que responda, no se registra. */
export async function registrarFuente(
  f: { institucion: string; titulo: string; anio: number; url: string; clave: string; nota: string | null },
  usuario: string,
): Promise<string> {
  if (f.institucion.length < 2 || f.titulo.length < 3 || f.clave.length < 5) throw new ErrorEditor("Completa institución, título y la forma de citarla.");
  if (!Number.isInteger(f.anio) || f.anio < 1990 || f.anio > 2100) throw new ErrorEditor("Año no válido.");
  if (!/^https:\/\//.test(f.url)) throw new ErrorEditor("El enlace debe empezar con https://");
  try {
    const r = await fetch(f.url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10_000), headers: { "user-agent": "Mozilla/5.0 PACHA" } });
    await r.body?.cancel();
    if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
  } catch (e) {
    throw new ErrorEditor(`El enlace no se pudo abrir (${e instanceof Error ? e.message : String(e)}). Sin un enlace que se pueda abrir, la fuente no se registra.`);
  }
  const existentes = await fuentesRegistradas();
  if (existentes.some((x) => x.claves.some((k) => k.toLowerCase() === f.clave.toLowerCase()))) throw new ErrorEditor("Ya hay una fuente que se cita así.");
  const base = `${f.institucion}-${f.titulo}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const id = `${base}-${f.anio}`.replace(/-+/g, "-");
  const { error } = await db().from("sources").insert({
    id, institucion: f.institucion, titulo: f.titulo, anio: f.anio, url: f.url, claves: [f.clave],
    consultado: new Date().toISOString().slice(0, 10), nota: f.nota, created_by: usuario,
  });
  if (error) throw new Error(error.code === "23505" ? "Ya existe una fuente con ese id." : error.message);
  return id;
}
