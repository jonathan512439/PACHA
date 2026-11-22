// Agrupación de reportes confirmados por problema (factor). Función pura: se prueba sin base de datos.

export const ETIQUETA_FACTOR: Record<string, string> = {
  sin_agua_consumo: "Sin agua para tomar",
  pozo_o_vertiente_seca: "Pozo o vertiente seca",
  sin_reserva_forraje: "Sin reserva de forraje",
  animales_sin_abrigo: "Animales sin abrigo",
  cultivos_sin_proteccion_helada: "Cultivos sin protección contra la helada",
  perdida_por_helada: "Pérdidas por helada",
  perdida_por_nevada: "Pérdidas por nevada",
  camino_cortado: "Camino cortado",
  otro: "Otros problemas",
};
export const etiquetaFactor = (f: string) => ETIQUETA_FACTOR[f] ?? f;

export type FilaReporteProblema = {
  community_id: string; comunidad: string; familiasComunidad: number;
  factor: string | null; confirmed_at: string | null; created_at: string;
  familias: number | null; dias: number | null;
};

export type ComunidadProblema = { id: string; nombre: string; familias: number; dias: number | null; desde: string };
export type Problema = {
  factor: string; etiqueta: string; comunidades: ComunidadProblema[];
  familias: number;        // suma por comunidad (del reporte o, si falta, de la comunidad)
  desde: string;           // confirmación más antigua
  maxDias: number | null;  // mayor "días sin recurso" reportado
};

/** Agrupa por factor; dentro de cada factor, una fila por comunidad (con sus valores máximos). */
export function agruparProblemas(filas: FilaReporteProblema[]): Problema[] {
  const porFactor = new Map<string, Map<string, ComunidadProblema>>();
  for (const r of filas) {
    const factor = r.factor ?? "otro";
    const comunidades = porFactor.get(factor) ?? new Map<string, ComunidadProblema>();
    const desde = r.confirmed_at ?? r.created_at;
    const familias = r.familias ?? r.familiasComunidad;
    const previa = comunidades.get(r.community_id);
    comunidades.set(r.community_id, previa ? {
      ...previa,
      familias: Math.max(previa.familias, familias),
      dias: r.dias === null ? previa.dias : Math.max(previa.dias ?? 0, r.dias),
      desde: desde < previa.desde ? desde : previa.desde,
    } : { id: r.community_id, nombre: r.comunidad, familias, dias: r.dias, desde });
    porFactor.set(factor, comunidades);
  }
  return [...porFactor.entries()].map(([factor, m]) => {
    const comunidades = [...m.values()].sort((a, b) => a.desde.localeCompare(b.desde));
    const dias = comunidades.map((c) => c.dias).filter((d): d is number => d !== null);
    return {
      factor, etiqueta: etiquetaFactor(factor), comunidades,
      familias: comunidades.reduce((s, c) => s + c.familias, 0),
      desde: comunidades[0].desde,
      maxDias: dias.length ? Math.max(...dias) : null,
    };
  }).sort((a, b) => b.comunidades.length - a.comunidades.length || b.familias - a.familias || a.etiqueta.localeCompare(b.etiqueta));
}
