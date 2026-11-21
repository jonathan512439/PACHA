// Prioridad de atención (cisternas / forraje) · v0.2. Fórmula simple, pública y explicable.
// Los pesos son una PROPUESTA del equipo: cambiarlos aquí y mostrarlos en /panel/prioridad.
// La "preparación" de la comunidad (checklist) NUNCA entra en esta fórmula.

export const PESOS = { sinRecurso: 45, familias: 25, animales: 15, espera: 15 } as const;
export const TOPES = { dias: 7, familias: 100, animales: 2000, esperaDias: 5 } as const;

export type EntradaPrioridad = {
  diasSinRecurso: number | null;   // del reporte; null = no lo dijeron
  familias: number | null;         // del reporte o, si falta, de la comunidad
  animales: number | null;
  horasDesdeReporte: number;
};

export type ResultadoPrioridad = {
  score: number; // 0-100
  desglose: { criterio: string; aporte: number; nota?: string }[];
  datosEstimados: string[]; // criterios con dato faltante (se usó valor neutro 0.5)
};

const tope = (v: number, max: number) => Math.min(Math.max(v / max, 0), 1);

export function prioridad(e: EntradaPrioridad): ResultadoPrioridad {
  const estimados: string[] = [];
  // neutro: faltar un dato no baja la prioridad
  const f = (valor: number | null, max: number, nombre: string) => {
    if (valor === null) { estimados.push(nombre); return { x: 0.5, estimado: true }; }
    return { x: tope(valor, max), estimado: false };
  };
  const partes = [
    { criterio: "Días sin agua/forraje", peso: PESOS.sinRecurso, ...f(e.diasSinRecurso, TOPES.dias, "dias_sin_recurso") },
    { criterio: "Familias afectadas", peso: PESOS.familias, ...f(e.familias, TOPES.familias, "familias") },
    { criterio: "Animales afectados", peso: PESOS.animales, ...f(e.animales, TOPES.animales, "animales") },
    { criterio: "Tiempo de espera", peso: PESOS.espera, x: tope(e.horasDesdeReporte / 24, TOPES.esperaDias), estimado: false },
  ];
  const desglose = partes.map((p) => ({
    criterio: p.criterio,
    aporte: Math.round(p.peso * p.x * 10) / 10,
    ...(p.estimado ? { nota: "dato faltante: valor neutro" } : {}),
  }));
  const score = Math.round(desglose.reduce((s, d) => s + d.aporte, 0) * 10) / 10;
  return { score, desglose, datosEstimados: estimados };
}

export type Urgencia = "rojo" | "naranja" | "amarillo" | "verde";
export const urgencia = (score: number): Urgencia =>
  score >= 70 ? "rojo" : score >= 50 ? "naranja" : score >= 30 ? "amarillo" : "verde";

/* ----------------------------------------------------------------------
 * v0.2 · Prioridad POR COMUNIDAD = máximo de sus reportes 'confirmado' que no están 'atendido'.
 * Los reportes en 'por_confirmar', 'revisar', 'descartado' y 'atendido' no cuentan.
 * La espera se recalcula al leer (desde confirmed_at, o created_at si falta).
 * -------------------------------------------------------------------- */
export type ReporteParaPrioridad = {
  id: string;
  status: "por_confirmar" | "confirmado" | "atendido" | "revisar" | "descartado";
  confirmedAt: Date | null;
  createdAt: Date;
  diasSinRecurso: number | null;
  familias: number | null;
  animales: number | null;
};

export type PrioridadComunidad =
  | { estado: "sin_reportes" }                       // se pinta gris en el mapa
  | { estado: "activa"; reporteId: string; urgencia: Urgencia; resultado: ResultadoPrioridad };

export function prioridadComunidad(
  reportes: ReporteParaPrioridad[],
  comunidad: { families: number; animals: number },
  ahora: Date = new Date(),
): PrioridadComunidad {
  let mejor: { reporteId: string; resultado: ResultadoPrioridad } | null = null;
  for (const r of reportes) {
    if (r.status !== "confirmado") continue;
    const desde = r.confirmedAt ?? r.createdAt;
    const resultado = prioridad({
      diasSinRecurso: r.diasSinRecurso,
      familias: r.familias ?? comunidad.families,  // si falta, el dato de la comunidad
      animales: r.animales ?? comunidad.animals,
      horasDesdeReporte: Math.max(0, (ahora.getTime() - desde.getTime()) / 3_600_000),
    });
    if (!mejor || resultado.score > mejor.resultado.score) mejor = { reporteId: r.id, resultado };
  }
  if (!mejor) return { estado: "sin_reportes" };
  return { estado: "activa", reporteId: mejor.reporteId, urgencia: urgencia(mejor.resultado.score), resultado: mejor.resultado };
}
