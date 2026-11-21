// Contratos de datos compartidos. Todo lo que Gemini devuelve se valida con Zod
// antes de guardarse o enviarse. Si no valida, el registro queda en 'revisar'.
import { z } from "zod";

/* ---------- Vocabulario controlado (aprendizaje por conteo, sin entrenar modelos) ---------- */
export const FACTORES = [
  "sin_agua_consumo",
  "pozo_o_vertiente_seca",
  "animales_sin_abrigo",
  "sin_reserva_forraje",
  "cultivos_sin_proteccion_helada",
  "perdida_por_helada",
  "perdida_por_nevada",
  "camino_cortado",
  "otro",
] as const;
export const Factor = z.enum(FACTORES);
export type Factor = z.infer<typeof Factor>;

export const AMENAZAS = ["helada", "sequia", "nevada"] as const;
export const Amenaza = z.enum(AMENAZAS);

/* ---------- 1. Reporte comunitario (voz/texto -> Gemini -> JSON) ---------- */
export const ReporteGemini = z.object({
  transcripcion: z.string().min(1),
  idioma: z.enum(["es", "qu", "ay", "mixto", "desconocido"]),
  tipo_reporte: z.enum(["agua", "dano", "forraje", "otro"]),
  comunidad_mencionada: z.string().nullable(),
  // días sin agua (tipo agua) o sin forraje (tipo forraje). null si no lo dijeron.
  dias_sin_recurso: z.number().int().min(0).max(60).nullable(),
  familias_afectadas: z.number().int().min(0).nullable(),
  animales_afectados: z.number().int().min(0).nullable(),
  factor: Factor.nullable(),
  confianza: z.number().min(0).max(1),
});
export type ReporteGemini = z.infer<typeof ReporteGemini>;

export const UMBRAL_CONFIANZA_REPORTE = 0.6; // por debajo -> status 'revisar'

/* ---------- 2. Extracción del boletín del Senamhi (PDF -> Gemini -> JSON) ---------- */
const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const AvisoGemini = z.object({
  encontrado: z.boolean(),
  estacion: z.string().nullable(),
  periodo_inicio: fechaISO.nullable(),
  periodo_fin: fechaISO.nullable(),
  fenomeno: z.enum(["helada", "nevada", "sequia", "ninguno"]),
  temp_minima_c: z.number().nullable(),
  nivel_senamhi: z.enum(["amarillo", "naranja", "rojo"]).nullable(),
  cita_textual: z.string().max(200).nullable(), // fragmento literal para que el humano verifique
  confianza: z.number().min(0).max(1),
});
export type AvisoGemini = z.infer<typeof AvisoGemini>;

// Umbral de DEMO, no oficial. Sustituir por criterio del Senamhi o de un técnico.
export const UMBRAL_HELADA_DEMO_C = -5;
export const UMBRAL_CONFIANZA_AVISO = 0.7;

/** El CÓDIGO decide si se prepara una alerta; Gemini solo extrae. Siempre pasa por aprobación humana. */
export function debeAlertar(a: AvisoGemini): boolean {
  if (!a.encontrado || a.confianza < UMBRAL_CONFIANZA_AVISO || a.fenomeno === "ninguno") return false;
  if (a.nivel_senamhi) return true; // si el Senamhi ya emitió nivel, lo retransmitimos
  return a.fenomeno === "helada" && a.temp_minima_c !== null && a.temp_minima_c <= UMBRAL_HELADA_DEMO_C;
}

/** Mensaje armado por plantilla (no por IA): fuente y fecha siempre visibles. */
export function construirMensajeAlerta(p: {
  aviso: AvisoGemini;
  estacion: string;
  boletinDemo: boolean;
  pasos: [string, string, string];
}): string {
  const { aviso, estacion, boletinDemo, pasos } = p;
  const titulo = { helada: "Aviso de helada", nevada: "Aviso de nevada", sequia: "Aviso de sequía", ninguno: "" }[aviso.fenomeno];
  const periodo = aviso.periodo_inicio && aviso.periodo_fin ? `${aviso.periodo_inicio} al ${aviso.periodo_fin}` : "fecha no indicada";
  const temp = aviso.temp_minima_c !== null ? ` Temperatura mínima indicada en el boletín: ${aviso.temp_minima_c} °C.` : "";
  return [
    `${titulo}${boletinDemo ? " (EJEMPLO con boletín histórico)" : ""}.`,
    `Fuente: Senamhi, boletín del ${periodo}. Estación: ${estacion}.${temp}`,
    `Qué hacer: 1) ${pasos[0]} 2) ${pasos[1]} 3) ${pasos[2]}`,
    `Mensaje con voz sintética. Si hay daños, respondan con un audio o una foto.`,
  ].join("\n");
}

/* ---------- 3. Tarjeta de lección (la escribe el equipo; Gemini solo elige id) ---------- */
export const FASES = ["antes_familia", "antes_animales", "durante", "despues"] as const;

export const Tarjeta = z.object({
  id: z.string().regex(/^(helada|sequia|nevada)-(antes_familia|antes_animales|durante|despues)-\d{2}$/),
  hazard: Amenaza,
  phase: z.enum(FASES),
  title: z.string().min(3).max(80),
  // 3 pasos, imperativo, máx. 18 palabras, sin dosis ni medicinas ni diagnósticos
  steps: z.tuple([z.string(), z.string(), z.string()]).refine(
    (s) => s.every((x) => x.trim().split(/\s+/).length <= 18),
    "Cada paso debe tener 18 palabras o menos",
  ),
  factor_tags: z.array(Factor).default([]),
  source_doc: z.string().min(3),
  source_page: z.string().min(1),
  source_url: z.string().url().optional(),
  reviewed_by: z.string().nullable().default(null),
  status: z.enum(["borrador", "revisada"]).default("borrador"),
}).refine((t) => t.status !== "revisada" || !!t.reviewed_by, "Una tarjeta revisada necesita revisor");
export type Tarjeta = z.infer<typeof Tarjeta>;

/** Respuesta de "Pregúntale al protocolo": Gemini solo devuelve ids; el sistema envía la tarjeta ya hecha. */
export const RespuestaProtocolo = z.object({
  tarjeta_ids: z.array(z.string()).max(3),
  encontrada: z.boolean(),
});
export type RespuestaProtocolo = z.infer<typeof RespuestaProtocolo>;
