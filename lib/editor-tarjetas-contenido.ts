// Editor de tarjetas (opción 2): lógica PURA, sin Supabase. La usan las acciones del panel, los scripts y las pruebas.
// Arma el contenido de una tarjeta desde el formulario, deduce el resumen de fuentes y valida con las mismas
// reglas que el seed: contrato Tarjeta, contenido prohibido y "toda cita corresponde a una fuente registrada".
import {
  AMENAZAS,
  FACTORES,
  FASES,
  PASOS_MAX,
  Tarjeta,
  type Factor,
  type FuentePaso,
  type TextoConFuente,
} from "@/contratos/tipos";
import { citasSinFuente, type Fuente } from "@/lib/fuentes";
import { problemasDeContenido } from "@/lib/tarjeta-contenido";
import { huellaVerificacion } from "@/lib/tarjeta-publica";

/** Lo que se guarda en lesson_versions.contenido: la tarjeta SIN estado ni verificación (eso lo pone quien verifica). */
export type ContenidoTarjeta = Omit<
  Tarjeta,
  "status" | "verified_by" | "reviewed_by" | "card_image_path" | "audio_ogg_path" | "audio_mp3_path"
>;

const SIN_CONTENIDO = new Set(["status", "verified_by", "reviewed_by", "card_image_path", "audio_ogg_path", "audio_mp3_path"]);

/** El contenido de una tarjeta publicada (sin estado, verificación, PNG ni audio): para el historial y para editarla. */
export const contenidoDeTarjeta = (t: Tarjeta): ContenidoTarjeta =>
  Object.fromEntries(Object.entries(t).filter(([k]) => !SIN_CONTENIDO.has(k))) as ContenidoTarjeta;

type Lector = { get(k: string): FormDataEntryValue | null; getAll(k: string): FormDataEntryValue[] };
const txt = (f: Lector, k: string) => String(f.get(k) ?? "").trim();

/** "doc" + "página" del formulario → FuentePaso, o null si falta alguno. */
function fuente(f: Lector, prefijo: string): FuentePaso | null {
  const doc = txt(f, `${prefijo}_fuente`);
  const page = txt(f, `${prefijo}_pagina`);
  return doc && page ? { doc, page } : null;
}

/**
 * Resumen que va en el pie y en la base (source_doc, source_page, author), deducido de las fuentes de los pasos:
 * - source_doc: el documento del primer paso;
 * - source_page: las páginas de cada paso, separadas por ";";
 * - author: las instituciones (lo que va antes de la primera coma del documento), sin repetir.
 */
export function resumenFuentes(fuentes: readonly FuentePaso[]) {
  const instituciones = [...new Set(fuentes.map((x) => x.doc.split(",")[0].trim()).filter(Boolean))];
  return {
    source_doc: fuentes[0]?.doc ?? "",
    source_page: fuentes.map((x) => x.page).join("; "),
    author: instituciones.join("; "),
  };
}

/** Id de una tarjeta nueva: amenaza-fase-NN. */
export const idTarjeta = (amenaza: string, fase: string, numero: number) =>
  `${amenaza}-${fase}-${String(numero).padStart(2, "0")}`;

/**
 * Contenido desde el formulario del editor:
 *   id (o amenaza + fase + numero si es nueva), titulo,
 *   paso1..paso5 + paso1_fuente/paso1_pagina…, por_que + por_que_fuente/_pagina,
 *   evitar1..2 + evitar1_fuente/_pagina, pedir_ayuda + pedir_ayuda_fuente/_pagina,
 *   factor (varios), header_image_path y paso1_imagen…paso5_imagen (o step_image_paths en JSON, formato anterior).
 * Los pasos vacíos se ignoran. No valida: para eso, validarContenido.
 */
export function contenidoDesdeFormulario(f: Lector): ContenidoTarjeta {
  const id = txt(f, "id") || idTarjeta(txt(f, "amenaza"), txt(f, "fase"), Number(txt(f, "numero") || "1"));
  const [hazard, ...resto] = id.split("-");
  const phase = resto.slice(0, -1).join("-");
  const pasos: { texto: string; fuente: FuentePaso; imagen: string | null }[] = [];
  // Editor con imagen por paso (paso1_imagen…): la imagen va pegada a SU paso aunque haya pasos vacíos en medio.
  const imagenPorPaso = Array.from({ length: PASOS_MAX }, (_, i) => f.get(`paso${i + 1}_imagen`)).some((x) => x !== null);
  for (let i = 1; i <= PASOS_MAX; i++) {
    const texto = txt(f, `paso${i}`);
    if (!texto) continue;
    pasos.push({ texto, fuente: fuente(f, `paso${i}`) ?? { doc: "", page: "" }, imagen: txt(f, `paso${i}_imagen`) || null });
  }
  const conFuente = (k: string): TextoConFuente | null => {
    const texto = txt(f, k);
    const fu = fuente(f, k);
    return texto ? { texto, fuente: fu ?? { doc: "", page: "" } } : null;
  };
  const evitar = [1, 2].map((i) => conFuente(`evitar${i}`)).filter((x): x is TextoConFuente => x !== null);
  const pedirAyudaTexto = txt(f, "pedir_ayuda");
  let stepImages: (string | null)[] = [];
  try {
    const crudo = JSON.parse(txt(f, "step_image_paths") || "[]");
    if (Array.isArray(crudo)) stepImages = crudo.map((x) => (typeof x === "string" ? x : null));
  } catch { /* sin imágenes: íconos de respaldo */ }
  const step_sources = pasos.map((p) => p.fuente);
  return {
    id,
    hazard: hazard as Tarjeta["hazard"],
    phase: phase as Tarjeta["phase"],
    title: txt(f, "titulo"),
    steps: pasos.map((p) => p.texto),
    step_sources,
    por_que: conFuente("por_que"),
    evitar: evitar.length ? evitar : null,
    pedir_ayuda: pedirAyudaTexto ? { texto: pedirAyudaTexto, fuente: fuente(f, "pedir_ayuda") } : null,
    factor_tags: f.getAll("factor").map(String).filter((x): x is Factor => (FACTORES as readonly string[]).includes(x)),
    ...resumenFuentes(step_sources),
    // header_imagen: editor con campo de imagen (vacío = se quitó); header_image_path: formato anterior.
    header_image_path: (f.get("header_imagen") !== null ? txt(f, "header_imagen") : txt(f, "header_image_path")) || null,
    step_image_paths: imagenPorPaso ? pasos.map((p) => p.imagen) : stepImages.slice(0, pasos.length),
  };
}

const archivo = (f: Lector, k: string) => {
  const v = f.get(k);
  return typeof v === "object" && v !== null && "size" in v && v.size > 0 ? (v as File) : null;
};

/**
 * Imágenes NUEVAS elegidas en el editor (header_archivo, paso1_archivo…), alineadas con los pasos que se guardan
 * (los pasos vacíos se saltan, igual que en contenidoDesdeFormulario).
 */
export function archivosDeImagenes(f: Lector): { encabezado: File | null; pasos: (File | null)[] } {
  const pasos: (File | null)[] = [];
  for (let i = 1; i <= PASOS_MAX; i++) if (txt(f, `paso${i}`)) pasos.push(archivo(f, `paso${i}_archivo`));
  return { encabezado: archivo(f, "header_archivo"), pasos };
}

/** true si las imágenes de la versión son las mismas que las de la tarjeta vigente (por posición de paso). */
export function mismasImagenes(
  a: Pick<ContenidoTarjeta, "header_image_path" | "step_image_paths" | "steps">,
  b: Pick<ContenidoTarjeta, "header_image_path" | "step_image_paths">,
): boolean {
  if ((a.header_image_path ?? null) !== (b.header_image_path ?? null)) return false;
  return a.steps.every((_, i) => (a.step_image_paths?.[i] ?? null) === (b.step_image_paths?.[i] ?? null));
}

/**
 * Problemas que impiden guardar o publicar (vacío = válido). Mismas reglas que el seed:
 * contrato Tarjeta (3 a 5 pasos, 18 palabras, fuente por paso…), contenido prohibido y fuentes registradas.
 */
export function validarContenido(c: ContenidoTarjeta, fuentes: readonly Fuente[]): string[] {
  const problemas: string[] = [];
  if (!(AMENAZAS as readonly string[]).includes(c.hazard) || !(FASES as readonly string[]).includes(c.phase)) {
    problemas.push(`id "${c.id}" no válido: debe ser amenaza-fase-NN (p. ej. sequia-despues-01)`);
  }
  if (!c.title.trim()) problemas.push("Falta el título.");
  if (c.steps.length < 3) problemas.push(`Hay ${c.steps.length} pasos: tienen que ser de 3 a 5.`);
  c.step_sources.forEach((f, i) => {
    if (!f.doc || !f.page) problemas.push(`Paso ${i + 1}: elige la fuente y escribe la página.`);
  });
  if (c.por_que && (!c.por_que.fuente.doc || !c.por_que.fuente.page)) problemas.push("Por qué importa: elige la fuente y escribe la página.");
  (c.evitar ?? []).forEach((e, i) => {
    if (!e.fuente.doc || !e.fuente.page) problemas.push(`Evita ${i + 1}: elige la fuente y escribe la página.`);
  });
  if (problemas.length) return problemas;
  const r = Tarjeta.safeParse({ ...c, status: "borrador", verified_by: null, reviewed_by: null });
  if (!r.success) {
    for (const i of r.error.issues) problemas.push(`${i.path.join(".") || "tarjeta"}: ${i.message}`);
    return problemas;
  }
  problemas.push(...problemasDeContenido(r.data));
  for (const doc of citasSinFuente(r.data, fuentes)) problemas.push(`fuente no registrada: "${doc}" (regístrala en Fuentes)`);
  return [...new Set(problemas)];
}

/** Huella de lo que se verifica (igual que verified_hash en tarjetas.json). */
export const huellaDeContenido = (c: ContenidoTarjeta) => huellaVerificacion(c);

const ORDINALES = ["uno", "dos", "tres", "cuatro", "cinco"];

/** Guion del audio de una tarjeta: título, pasos exactos y fuente (mismo formato que data/tarjetas/guiones_audio.json). */
export function guionAudioTarjeta(c: Pick<ContenidoTarjeta, "title" | "steps" | "author">): string {
  const fuente = c.author
    .split(";")
    .map((x) => x.trim().replace(/–INSA$/, "").replace(/\s*\(EE\. UU\.\)/, " de Estados Unidos"))
    .filter(Boolean)
    .join(" y ");
  return `${c.title}. ${c.steps.map((p, i) => `Paso ${ORDINALES[i]}: ${p}`).join(" ")} Fuente: ${fuente}.`;
}

/** Enlace para abrir la fuente en la página citada (PDF: #page=N con la primera página del texto). */
export function enlaceAPagina(url: string | null, page: string): string | null {
  if (!url) return null;
  const n = page.replace(/\([^)]*\)/g, "").match(/\d+/)?.[0];
  return /\.pdf($|\?)/i.test(url) && n ? `${url}#page=${n}` : url;
}
