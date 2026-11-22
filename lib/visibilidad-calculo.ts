// «Sin agua, a la vista»: cálculos puros (sin base de datos) para el mapa, la portada, la ficha y el resumen.
// Solo usa datos que la comunidad confirmó. Nunca nombres ni teléfonos.

export type TipoProblema = "agua" | "forraje" | "dano" | "otro";

export type ReporteVis = {
  id: string;
  community_id: string;
  type: TipoProblema;
  factor: string | null;
  status: "por_confirmar" | "confirmado" | "atendido" | "revisar" | "descartado";
  created_at: string;
  confirmed_at: string | null;
  /** Días sin agua o forraje que dijo la comunidad al reportar (null = no lo dijo). */
  dias: number | null;
  familias: number | null;
};

export type EntregaVis = {
  id: string;
  community_id: string;
  report_id: string | null;
  kind: "cisterna" | "forraje";
  quantity: number;
  unit: string;
  delivered_at: string;
  /** null = sin respuesta · true = llegó · false = no llegó */
  confirmed_by_community: boolean | null;
  confirmed_at: string | null;
  is_example: boolean;
};

export type Contador = {
  recurso: "agua" | "forraje";
  /** Días acumulados: los que dijo al reportar + los que pasaron desde entonces. */
  dias: number;
  /** true si la comunidad no dijo cuántos días llevaba: el número es "al menos". */
  minimo: boolean;
  desde: string;
  familias: number | null;
};

export type VisibilidadComunidad = {
  sinAgua: Contador | null;
  sinForraje: Contador | null;
  /** Problemas con reporte confirmado sin resolver. */
  problemas: TipoProblema[];
  /** Factor del reporte confirmado más reciente (id de FACTORES). */
  factor: string | null;
  ultimaEntrega: EntregaVis | null;
  /** Tiene un problema activo y ninguna entrega registrada desde que lo reportó. */
  sinEntrega: boolean;
};

const DIA = 86_400_000;
const ACTIVOS = new Set(["confirmado", "atendido"]);

/** Días enteros transcurridos entre dos fechas (nunca negativo). */
export const diasEntre = (desde: string | Date, hasta: Date) => Math.max(0, Math.floor((hasta.getTime() - new Date(desde).getTime()) / DIA));

/** La comunidad confirmó que llegó la ayuda para este reporte (o una entrega posterior en su comunidad, sin reporte asociado). */
export function resuelto(r: ReporteVis, entregas: EntregaVis[]): boolean {
  return entregas.some(
    (e) =>
      e.confirmed_by_community === true &&
      e.community_id === r.community_id &&
      (e.report_id === r.id || (e.report_id === null && e.delivered_at >= r.created_at)),
  );
}

/** Reportes que siguen abiertos: confirmados o atendidos, mientras la comunidad no confirme que llegó la ayuda. */
export function reportesAbiertos(reportes: ReporteVis[], entregas: EntregaVis[]): ReporteVis[] {
  return reportes.filter((r) => ACTIVOS.has(r.status) && !resuelto(r, entregas));
}

function contador(abiertos: ReporteVis[], recurso: "agua" | "forraje", ahora: Date): Contador | null {
  let mejor: Contador | null = null;
  for (const r of abiertos) {
    if (r.type !== recurso) continue;
    const c: Contador = {
      recurso,
      dias: (r.dias ?? 0) + diasEntre(r.created_at, ahora),
      minimo: r.dias == null,
      desde: r.created_at,
      familias: r.familias,
    };
    if (!mejor || c.dias > mejor.dias) mejor = c;
  }
  return mejor;
}

/** Estado público de una comunidad a partir de SUS reportes y entregas. */
export function visibilidadComunidad(reportes: ReporteVis[], entregas: EntregaVis[], ahora = new Date()): VisibilidadComunidad {
  const abiertos = reportesAbiertos(reportes, entregas);
  const ordenEntregas = [...entregas].sort((a, b) => b.delivered_at.localeCompare(a.delivered_at));
  const masAntiguo = abiertos.reduce<string | null>((m, r) => (m === null || r.created_at < m ? r.created_at : m), null);
  const recientes = [...abiertos].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    sinAgua: contador(abiertos, "agua", ahora),
    sinForraje: contador(abiertos, "forraje", ahora),
    problemas: [...new Set(abiertos.map((r) => r.type))],
    factor: recientes[0]?.factor ?? null,
    ultimaEntrega: ordenEntregas[0] ?? null,
    sinEntrega: masAntiguo !== null && !entregas.some((e) => e.delivered_at >= masAntiguo),
  };
}

/** Agrupa por comunidad y calcula su visibilidad. */
export function visibilidadPorComunidad(reportes: ReporteVis[], entregas: EntregaVis[], ahora = new Date()) {
  const rs = new Map<string, ReporteVis[]>();
  const es = new Map<string, EntregaVis[]>();
  for (const r of reportes) rs.set(r.community_id, [...(rs.get(r.community_id) ?? []), r]);
  for (const e of entregas) es.set(e.community_id, [...(es.get(e.community_id) ?? []), e]);
  const ids = new Set([...rs.keys(), ...es.keys()]);
  return new Map([...ids].map((id) => [id, visibilidadComunidad(rs.get(id) ?? [], es.get(id) ?? [], ahora)]));
}

export const VACIA: VisibilidadComunidad = { sinAgua: null, sinForraje: null, problemas: [], factor: null, ultimaEntrega: null, sinEntrega: false };

/** "6 días sin agua" · "al menos 2 días sin forraje" */
export function textoContador(c: Contador): string {
  const n = c.dias === 1 ? "1 día" : `${c.dias} días`;
  return `${c.minimo ? "al menos " : ""}${n} sin ${c.recurso}`;
}

/** "2 cisternas" · "300 kg de forraje" */
export function textoEntrega(e: Pick<EntregaVis, "kind" | "quantity" | "unit">): string {
  const q = new Intl.NumberFormat("es-BO").format(e.quantity);
  if (e.unit === "kg") return `${q} kg de forraje`;
  return `${q} ${e.quantity === 1 ? "cisterna" : "cisternas"} de agua`;
}

export const textoRespuesta = (v: boolean | null) => (v === true ? "Llegó" : v === false ? "No llegó" : "Sin respuesta");

/* ---------------------- Ficha pública y rendición de cuentas ---------------------- */

export type Evento = {
  fecha: string;
  tipo: "reporto" | "confirmo" | "entrega" | "respuesta";
  texto: string;
  /** Solo en "respuesta": lo que dijo la comunidad. */
  llego?: boolean;
};

const PROBLEMA: Record<TipoProblema, string> = { agua: "falta de agua", forraje: "falta de forraje", dano: "daños", otro: "un problema" };

/** Línea de tiempo pública: reportó → confirmó → entrega registrada → la comunidad respondió. Orden cronológico. */
export function lineaDeTiempo(reportes: ReporteVis[], entregas: EntregaVis[], etiquetaFactor: (f: string) => string = (f) => f): Evento[] {
  const ev: Evento[] = [];
  for (const r of reportes) {
    const detalle = [r.factor ? etiquetaFactor(r.factor).toLowerCase() : null, r.dias != null ? `${r.dias} ${r.dias === 1 ? "día" : "días"} sin recurso` : null, r.familias != null ? `${r.familias} familias` : null]
      .filter(Boolean)
      .join(" · ");
    ev.push({ fecha: r.created_at, tipo: "reporto", texto: `La comunidad reportó ${PROBLEMA[r.type]}${detalle ? ` (${detalle})` : ""}.` });
    if (r.confirmed_at) ev.push({ fecha: r.confirmed_at, tipo: "confirmo", texto: "La comunidad confirmó el reporte. Entró a la prioridad pública." });
  }
  for (const e of entregas) {
    ev.push({ fecha: e.delivered_at, tipo: "entrega", texto: `Entrega registrada: ${textoEntrega(e)}.` });
    if (e.confirmed_by_community !== null)
      ev.push({
        fecha: e.confirmed_at ?? e.delivered_at,
        tipo: "respuesta",
        llego: e.confirmed_by_community,
        texto: e.confirmed_by_community ? "La comunidad confirmó que la entrega llegó." : "La comunidad dijo que la entrega no llegó.",
      });
  }
  return ev.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export type TiemposRespuesta = {
  /** Horas desde el reporte hasta la entrega (promedio de las entregas con reporte asociado). */
  reporteAEntrega: number | null;
  /** Horas desde la entrega hasta que la comunidad respondió. */
  entregaARespuesta: number | null;
  entregasMedidas: number;
};

const HORA = 3_600_000;
const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

/** Tiempo de respuesta público (rendición de cuentas). Solo mide entregas enlazadas a su reporte. */
export function tiemposRespuesta(reportes: Pick<ReporteVis, "id" | "created_at">[], entregas: EntregaVis[]): TiemposRespuesta {
  const porId = new Map(reportes.map((r) => [r.id, r]));
  const aEntrega: number[] = [];
  const aRespuesta: number[] = [];
  for (const e of entregas) {
    const r = e.report_id ? porId.get(e.report_id) : undefined;
    if (r) aEntrega.push(Math.max(0, (new Date(e.delivered_at).getTime() - new Date(r.created_at).getTime()) / HORA));
    if (e.confirmed_by_community !== null && e.confirmed_at)
      aRespuesta.push(Math.max(0, (new Date(e.confirmed_at).getTime() - new Date(e.delivered_at).getTime()) / HORA));
  }
  return { reporteAEntrega: promedio(aEntrega), entregaARespuesta: promedio(aRespuesta), entregasMedidas: aEntrega.length };
}

/** "20 h" · "2 días y 3 h" */
export function textoHoras(h: number): string {
  if (h < 1) return "menos de 1 h";
  if (h < 48) return `${Math.round(h)} h`;
  const d = Math.floor(h / 24);
  const r = Math.round(h - d * 24);
  return r ? `${d} días y ${r} h` : `${d} días`;
}

/**
 * Texto para compartir por WhatsApp: solo hechos confirmados, sin exagerar.
 * "Kantuta Pampa lleva 6 días sin agua (40 familias). Datos confirmados por la comunidad: <enlace>"
 */
export function textoCompartir(p: { nombre: string; ejemplo: boolean; vis: VisibilidadComunidad; url: string }): string {
  const c = p.vis.sinAgua ?? p.vis.sinForraje;
  const pre = p.ejemplo ? "[EJEMPLO] " : "";
  if (!c) return `${pre}${p.nombre}: ficha pública con sus reportes y entregas. ${p.url}`;
  const familias = c.familias != null ? ` (${c.familias} familias)` : "";
  const entrega = p.vis.sinEntrega ? " Sin entrega todavía." : "";
  return `${pre}${p.nombre} lleva ${textoContador(c)}${familias}.${entrega} Datos confirmados por la comunidad: ${p.url}`;
}

/* ------------------------------ Resumen semanal ------------------------------ */

export type ResumenSemanal = {
  comunidadesSinAgua: number;
  comunidadesSinForraje: number;
  /** Suma de los días sin agua o forraje de todas las comunidades (el mayor de cada una). */
  diasAcumulados: number;
  familiasAfectadas: number;
  pendientesSinEntrega: number;
  entregas: { total: number; llego: number; noLlego: number; sinRespuesta: number };
};

/** Familias afectadas de una comunidad: las que dijo el reporte o, si no lo dijo, las de la comunidad. */
const familiasAfectadas = (c: { families: number; vis: VisibilidadComunidad }) => {
  const dichas = [c.vis.sinAgua?.familias, c.vis.sinForraje?.familias].filter((x): x is number => x != null);
  return dichas.length ? Math.max(...dichas) : c.families;
};

/** Cifras del resumen para autoridades y prensa. Entregas: las de los últimos `dias` días. */
export function resumenSemanal(
  comunidades: { families: number; vis: VisibilidadComunidad }[],
  entregas: EntregaVis[],
  ahora = new Date(),
  dias = 7,
): ResumenSemanal {
  const desde = new Date(ahora.getTime() - dias * DIA).toISOString();
  const recientes = entregas.filter((e) => e.delivered_at >= desde);
  const afectadas = comunidades.filter((c) => c.vis.sinAgua || c.vis.sinForraje);
  return {
    comunidadesSinAgua: comunidades.filter((c) => c.vis.sinAgua).length,
    comunidadesSinForraje: comunidades.filter((c) => c.vis.sinForraje).length,
    diasAcumulados: afectadas.reduce((s, c) => s + Math.max(c.vis.sinAgua?.dias ?? 0, c.vis.sinForraje?.dias ?? 0), 0),
    familiasAfectadas: afectadas.reduce((s, c) => s + familiasAfectadas(c), 0),
    pendientesSinEntrega: comunidades.filter((c) => c.vis.sinEntrega).length,
    entregas: {
      total: recientes.length,
      llego: recientes.filter((e) => e.confirmed_by_community === true).length,
      noLlego: recientes.filter((e) => e.confirmed_by_community === false).length,
      sinRespuesta: recientes.filter((e) => e.confirmed_by_community === null).length,
    },
  };
}
