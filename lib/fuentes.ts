// Lista de fuentes oficiales (data/fuentes.json). Lógica PURA: sin Supabase ni "server-only".
// La usan /fuentes y /tarjetas/[id] (INTERFAZ), el bot y las pruebas.
// Regla: ninguna fuente se muestra como enlace si su `url` no se pudo abrir y leer (url = null → "enlace por confirmar").
import { z } from "zod";
import crudo from "@/data/fuentes.json";
import type { FuentePaso, Tarjeta } from "@/contratos/tipos";

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Fuente = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  institucion: z.string().min(2),             // p. ej. "Senamhi–INSA", "FAO"
  titulo: z.string().min(3),                  // título del documento original
  anio: z.number().int().min(1990).max(2100),
  url: z.string().url().nullable(),           // enlace al ORIGINAL; null = no se pudo abrir (no se enlaza)
  // Textos con que las tarjetas citan esta fuente en `doc` (step_sources, por_que, evitar…).
  // Un `doc` corresponde a esta fuente si CONTIENE alguna clave.
  claves: z.array(z.string().min(3)).min(1),
  tarjetas: z.array(z.string()),              // ids de las tarjetas que la usan
  consultado: fechaISO,                       // fecha en que se abrió y leyó el enlace
  nota: z.string().nullable(),
});
export type Fuente = z.infer<typeof Fuente>;

/** Todas las fuentes, validadas al cargar (si el JSON está mal, falla el build y las pruebas). */
export const FUENTES: readonly Fuente[] = z.array(Fuente).parse(crudo);

/** Todas las fuentes, ordenadas por institución y año (más reciente primero). */
export function listarFuentes(): Fuente[] {
  return [...FUENTES].sort((a, b) => a.institucion.localeCompare(b.institucion, "es") || b.anio - a.anio);
}

export function obtenerFuente(id: string): Fuente | null {
  return FUENTES.find((f) => f.id === id) ?? null;
}

/** Fuentes a las que corresponde un `doc` citado (un paso puede citar dos: "Senamhi… / CIPCA…"). */
export function fuentesDeDoc(doc: string): Fuente[] {
  return FUENTES.filter((f) => f.claves.some((c) => doc.includes(c)));
}

/** Todas las citas {doc, page} de una tarjeta: pasos y, si existen, por qué, evita y pide ayuda. */
export function citasDeTarjeta(
  t: Pick<Tarjeta, "step_sources"> & Partial<Pick<Tarjeta, "por_que" | "evitar" | "pedir_ayuda">>,
): FuentePaso[] {
  return [
    ...t.step_sources,
    ...(t.por_que ? [t.por_que.fuente] : []),
    ...(t.evitar ?? []).map((e) => e.fuente),
    ...(t.pedir_ayuda?.fuente ? [t.pedir_ayuda.fuente] : []),
  ];
}

/**
 * Fuentes de una tarjeta para la sección "Fuentes": las que cita en su texto, sin repetir,
 * en el orden en que aparecen. Cada una con las páginas citadas.
 */
export function fuentesDeTarjeta(
  t: Parameters<typeof citasDeTarjeta>[0],
): { fuente: Fuente; paginas: string[] }[] {
  const porId = new Map<string, { fuente: Fuente; paginas: string[] }>();
  for (const cita of citasDeTarjeta(t)) {
    for (const fuente of fuentesDeDoc(cita.doc)) {
      const item = porId.get(fuente.id) ?? { fuente, paginas: [] };
      if (!item.paginas.includes(cita.page)) item.paginas.push(cita.page);
      porId.set(fuente.id, item);
    }
  }
  return [...porId.values()];
}

/** Citas de una tarjeta que no corresponden a ninguna fuente de la lista (deben ser 0: lo comprueba una prueba). */
export function citasSinFuente(t: Parameters<typeof citasDeTarjeta>[0]): string[] {
  return citasDeTarjeta(t).filter((c) => fuentesDeDoc(c.doc).length === 0).map((c) => c.doc);
}

/** Texto corto para mostrar: "FAO (2010)". */
export const etiquetaFuente = (f: Pick<Fuente, "institucion" | "anio">) => `${f.institucion} (${f.anio})`;
