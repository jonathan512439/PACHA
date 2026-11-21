// Prioridad de atención (cisternas / forraje). Fórmula simple, pública y explicable.
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
  const f = (valor: number | null, max: number, nombre: string) => {
    if (valor === null) { estimados.push(nombre); return 0.5; } // neutro: faltar un dato no baja la prioridad
    return tope(valor, max);
  };
  const partes = [
    { criterio: "Días sin agua/forraje", peso: PESOS.sinRecurso, x: f(e.diasSinRecurso, TOPES.dias, "dias_sin_recurso") },
    { criterio: "Familias afectadas", peso: PESOS.familias, x: f(e.familias, TOPES.familias, "familias") },
    { criterio: "Animales afectados", peso: PESOS.animales, x: f(e.animales, TOPES.animales, "animales") },
    { criterio: "Tiempo de espera", peso: PESOS.espera, x: tope(e.horasDesdeReporte / 24, TOPES.esperaDias) },
  ];
  const desglose = partes.map((p) => ({ criterio: p.criterio, aporte: Math.round(p.peso * p.x * 10) / 10 }));
  const score = Math.round(desglose.reduce((s, d) => s + d.aporte, 0) * 10) / 10;
  return { score, desglose, datosEstimados: estimados };
}

export type Urgencia = "rojo" | "naranja" | "amarillo" | "verde";
export const urgencia = (score: number): Urgencia =>
  score >= 70 ? "rojo" : score >= 50 ? "naranja" : score >= 30 ? "amarillo" : "verde";
