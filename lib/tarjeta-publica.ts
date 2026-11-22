// Lógica PURA de publicación y presentación de tarjetas (sin Supabase, sin "server-only").
// La usan la web (/tarjetas/[id]), el bot (SalidaBot) y las pruebas. Una sola fuente de verdad.
import {
  ESTADOS_TARJETA_ENVIABLES,
  ETIQUETA_BORRADOR,
  etiquetaEstadoTarjeta,
  type FuentePaso,
  type SalidaBot,
  type Tarjeta,
} from "@/contratos/tipos";

/* ---------------------------------------------------------------------------
 * Regla de publicación
 *   Por defecto solo salen tarjetas `verificada` o `revisada`.
 *   DEMO_PERMITIR_BORRADOR=1 deja salir `borrador`, SIEMPRE con la etiqueta "BORRADOR · sin verificar".
 * ------------------------------------------------------------------------- */
type Entorno = Record<string, string | undefined>;

/** true solo si DEMO_PERMITIR_BORRADOR vale exactamente "1". Cualquier otro valor = apagado. */
export function permitirBorrador(env: Entorno = process.env): boolean {
  return env.DEMO_PERMITIR_BORRADOR === "1";
}

export function estadosPublicables(permitir: boolean): readonly Tarjeta["status"][] {
  return permitir ? [...ESTADOS_TARJETA_ENVIABLES, "borrador"] : ESTADOS_TARJETA_ENVIABLES;
}

export function puedePublicarse(t: Pick<Tarjeta, "status">, permitir: boolean): boolean {
  return estadosPublicables(permitir).includes(t.status);
}

export const esBorrador = (t: Pick<Tarjeta, "status">) => t.status === "borrador";

/** Texto fijo cuando una tarjeta existe pero no se puede mostrar. */
export const MENSAJE_EN_VERIFICACION = "Esta tarjeta está en verificación.";

/* ---------------------------------------------------------------------------
 * Pie: fuentes por paso, agrupadas por documento, con página. No reescribe texto.
 *   "Doc A: p. 7 (paso 1), p. 6 (pasos 2 y 3)"
 * ------------------------------------------------------------------------- */
export function resumirFuentes(fuentes: readonly FuentePaso[]): string[] {
  const porDoc = new Map<string, Map<string, number[]>>();
  fuentes.forEach((f, i) => {
    const paginas = porDoc.get(f.doc) ?? new Map<string, number[]>();
    paginas.set(f.page, [...(paginas.get(f.page) ?? []), i + 1]);
    porDoc.set(f.doc, paginas);
  });
  return [...porDoc].map(([doc, paginas]) => {
    const partes = [...paginas].map(([page, pasos]) => {
      const lista = pasos.length === 1 ? `paso ${pasos[0]}` : `pasos ${pasos.slice(0, -1).join(", ")} y ${pasos.at(-1)}`;
      return `${page} (${lista})`;
    });
    return `${doc}: ${partes.join(", ")}`;
  });
}

/* ---------------------------------------------------------------------------
 * Imágenes: URLs públicas de Storage con respaldo. Ninguna tarjeta queda con hueco.
 * ------------------------------------------------------------------------- */
export const BUCKET_IMAGENES = "tarjetas";
export const BUCKET_AUDIOS = "audios";
/** Si una tarjeta no tiene encabezado, usa el de esta. */
export const ID_ENCABEZADO_RESPALDO = "helada-antes_animales-01";

export type TemaIcono = "gotas" | "heno" | "corral" | "semilla";

/** Ícono neutro de cada paso (texto congelado, así que el mapeo es fijo). */
const ICONOS_POR_TARJETA: Record<string, [TemaIcono, TemaIcono, TemaIcono]> = {
  "helada-antes_familia-01":  ["semilla", "semilla", "gotas"],
  "helada-antes_animales-01": ["corral", "heno", "heno"],
  "helada-durante-01":        ["corral", "corral", "heno"],
  "sequia-antes_familia-01":  ["gotas", "gotas", "gotas"],
  "sequia-antes_animales-01": ["heno", "corral", "corral"],
  "sequia-durante-01":        ["semilla", "heno", "gotas"],
};

export function temaIconoPaso(t: Pick<Tarjeta, "id" | "hazard" | "phase">, i: number): TemaIcono {
  const fijo = ICONOS_POR_TARJETA[t.id]?.[i];
  if (fijo) return fijo;
  if (t.phase === "antes_animales" || t.phase === "durante") return "corral";
  return t.hazard === "sequia" ? "gotas" : "semilla";
}

/** Base pública de Storage. Acepta SUPABASE_URL con o sin sufijo (/rest/v1/). */
export function baseStorage(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    return `${new URL(supabaseUrl).origin}/storage/v1/object/public`;
  } catch {
    return null;
  }
}

export function urlPublica(base: string | null, bucket: string, ruta: string | null | undefined): string | null {
  if (!base || !ruta) return null;
  return `${base}/${bucket}/${ruta.split("/").map(encodeURIComponent).join("/")}`;
}

export type ImagenesTarjeta = {
  /** Encabezado propio, o el de respaldo, o null (franja neutra con ícono). */
  encabezado: string | null;
  /** Encabezado de respaldo para usar si el propio falla al cargar en el navegador. */
  encabezadoRespaldo: string | null;
  pasos: { url: string | null; icono: TemaIcono }[];
};

/**
 * v0.4: devuelve una imagen (o ícono) por paso. Con `steps`, tantas como pasos (3 a 5);
 * sin `steps`, 3 (compatibilidad con v0.3).
 */
export function resolverImagenes(
  t: Pick<Tarjeta, "id" | "hazard" | "phase" | "header_image_path" | "step_image_paths"> & { steps?: readonly string[] },
  base: string | null,
  rutaEncabezadoRespaldo: string | null,
): ImagenesTarjeta {
  const respaldo = urlPublica(base, BUCKET_IMAGENES, rutaEncabezadoRespaldo);
  const propio = urlPublica(base, BUCKET_IMAGENES, t.header_image_path);
  const cantidad = Math.max(3, t.steps?.length ?? 3);
  return {
    encabezado: propio ?? respaldo,
    encabezadoRespaldo: propio ? respaldo : null,
    pasos: Array.from({ length: cantidad }, (_, i) => i).map((i) => ({
      url: urlPublica(base, BUCKET_IMAGENES, t.step_image_paths?.[i]),
      icono: temaIconoPaso(t, i),
    })),
  };
}

/* ---------------------------------------------------------------------------
 * Huella del contenido visible: el PNG exportado lleva la huella en el nombre.
 * El bot solo adjunta el PNG si su huella coincide con la tarjeta actual, así un PNG
 * exportado como "verificada" nunca sale para una tarjeta que volvió a borrador (ni al revés).
 * ------------------------------------------------------------------------- */
function fnv1a(texto: string): string {
  let h = 0x811c9dc5; // FNV-1a 32 bits (determinista, sin dependencias: sirve en Node y en el navegador)
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

type SeccionesV04 = Partial<Pick<Tarjeta, "por_que" | "evitar" | "pedir_ayuda">>;

/**
 * v0.4: las secciones nuevas entran en la huella SOLO si la tarjeta las trae.
 * Así las 6 tarjetas v0.3 conservan su huella (verified_hash, PNG y audio siguen valiendo).
 */
const extraV04 = (t: SeccionesV04) =>
  t.por_que || t.evitar?.length || t.pedir_ayuda ? [[t.por_que ?? null, t.evitar ?? null, t.pedir_ayuda ?? null]] : [];

/** Huella de lo que se ve Y del estado (para el PNG, que dibuja la etiqueta de estado). */
export function huellaTarjeta(
  t: Pick<Tarjeta, "title" | "steps" | "step_sources" | "status" | "reviewed_by"> & SeccionesV04,
): string {
  return fnv1a(JSON.stringify([t.title, t.steps, t.step_sources, t.status, t.reviewed_by, ...extraV04(t)]));
}

/**
 * Huella de TODO lo que se verifica: título, pasos y fuentes, más por qué / evita / pide ayuda si existen.
 * Es la que se guarda como `verified_hash`. Sin secciones v0.4 es igual a huellaContenido.
 */
export function huellaVerificacion(t: Pick<Tarjeta, "title" | "steps" | "step_sources"> & SeccionesV04): string {
  return fnv1a(JSON.stringify([t.title, t.steps, t.step_sources, ...extraV04(t)]));
}

/**
 * Huella de lo que dice el AUDIO: título, pasos y fuentes con página (sin estado ni secciones v0.4).
 * - Va en el nombre del audio: el bot solo adjunta el audio que dice el texto actual.
 * - Para `verified_hash` se usa huellaVerificacion (igual a esta si la tarjeta no trae secciones v0.4).
 */
export function huellaContenido(t: Pick<Tarjeta, "title" | "steps" | "step_sources">): string {
  return fnv1a(JSON.stringify([t.title, t.steps, t.step_sources]));
}

/** Ruta del audio en el bucket 'audios': lessons/<id>-<huellaContenido>.ogg|mp3 */
export const rutaAudioTarjeta = (t: Parameters<typeof huellaContenido>[0] & { id: string }, ext: "ogg" | "mp3") =>
  `lessons/${t.id}-${huellaContenido(t)}.${ext}`;

/** El audio guardado es válido solo si se grabó con el texto actual. */
export function audioVigente(
  t: Parameters<typeof rutaAudioTarjeta>[0] & Pick<Tarjeta, "audio_ogg_path" | "audio_mp3_path">,
  ext: "ogg" | "mp3",
): boolean {
  const ruta = ext === "ogg" ? t.audio_ogg_path : t.audio_mp3_path;
  return !!ruta && ruta === rutaAudioTarjeta(t, ext);
}

export const rutaPngTarjeta = (t: Parameters<typeof huellaTarjeta>[0] & { id: string }) =>
  `lessons/${t.id}/tarjeta-${t.status}-${huellaTarjeta(t)}.png`;

/** El PNG guardado es válido solo si corresponde al contenido y estado actuales. */
export function pngVigente(t: Parameters<typeof rutaPngTarjeta>[0] & { card_image_path: string | null }): boolean {
  return !!t.card_image_path && t.card_image_path === rutaPngTarjeta(t);
}

/* ---------------------------------------------------------------------------
 * Mensaje del bot. Devuelve null si la tarjeta no se puede enviar.
 * En borrador, la etiqueta va en `etiquetaEstado` Y en el título, para que ningún
 * adaptador pueda mostrar la tarjeta sin ella.
 * ------------------------------------------------------------------------- */
export function tarjetaASalidaBot(
  t: Tarjeta,
  opciones: { permitirBorrador: boolean; supabaseUrl: string | undefined; urlSitio?: string },
): Extract<SalidaBot, { tipo: "tarjeta" }> | null {
  if (!puedePublicarse(t, opciones.permitirBorrador)) return null;
  const base = baseStorage(opciones.supabaseUrl);
  const borrador = esBorrador(t);
  const imagen = pngVigente(t) ? urlPublica(base, BUCKET_IMAGENES, t.card_image_path) : null;
  // Un audio grabado con un texto anterior NO se adjunta (diría otra cosa que la tarjeta).
  const ogg = audioVigente(t, "ogg") ? urlPublica(base, BUCKET_AUDIOS, t.audio_ogg_path) : null;
  const mp3 = audioVigente(t, "mp3") ? urlPublica(base, BUCKET_AUDIOS, t.audio_mp3_path) : null;
  const urlCompleta = urlTarjetaCompleta(opciones.urlSitio, t.id);
  return {
    tipo: "tarjeta",
    id: t.id,
    titulo: borrador ? `[${ETIQUETA_BORRADOR}] ${t.title}` : t.title,
    pasos: t.steps,
    fuente: resumirFuentes(t.step_sources).join(" · "),
    pagina: t.source_page,
    etiquetaEstado: etiquetaEstadoTarjeta(t),
    ...(t.source_url ? { fuenteUrl: t.source_url } : {}),
    // Sin audio o sin PNG: se envía solo texto (y lo que haya). Nunca falla por eso.
    ...(ogg ? { audioOggUrl: ogg } : {}),
    ...(mp3 ? { audioMp3Url: mp3 } : {}),
    ...(imagen ? { imagenUrl: imagen } : {}),
    ...(urlCompleta ? { urlCompleta } : {}),
  };
}

/** "Ver tarjeta completa": <sitio>/tarjetas/<id>. null si no hay una URL válida del sitio. */
export function urlTarjetaCompleta(urlSitio: string | undefined, id: string): string | null {
  if (!urlSitio) return null;
  try {
    return new URL(`/tarjetas/${encodeURIComponent(id)}`, urlSitio).toString();
  } catch {
    return null;
  }
}
