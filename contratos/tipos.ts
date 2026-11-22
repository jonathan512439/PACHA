// Contratos de datos compartidos · v0.4 (dom 22 nov 2026; v0.4 = tarjetas con por_que, evitar, pedir_ayuda y 3–5 pasos). Requiere Zod v4.
// Todo lo que Gemini devuelve se valida con Zod antes de guardarse o enviarse.
// Si no valida, el registro queda en 'revisar' (reportes) o el boletín en 'error'.
import { z } from "zod";

/* ======================================================================
 * Vocabulario controlado
 * ==================================================================== */
export const FACTORES = [
  "sin_agua_consumo",
  "pozo_o_vertiente_seca",
  "animales_sin_abrigo",
  "sin_reserva_forraje",
  "cultivos_sin_proteccion_helada",
  "perdida_por_helada",
  "perdida_por_nevada",
  "camino_cortado",
  "cultivos_sin_agua", // v0.4: cultivos afectados por la sequía (tarjeta sequia-durante-02)
  "otro",
] as const;
export const Factor = z.enum(FACTORES);
export type Factor = z.infer<typeof Factor>;

export const AMENAZAS = ["helada", "sequia", "nevada"] as const;
export const Amenaza = z.enum(AMENAZAS);
export type Amenaza = z.infer<typeof Amenaza>;

export const FASES = ["antes_familia", "antes_animales", "durante", "despues"] as const;
export const Fase = z.enum(FASES);

export const CANALES = ["whatsapp", "telegram", "web"] as const;
export const Canal = z.enum(CANALES);
export type Canal = z.infer<typeof Canal>;

export const ESTADOS_REPORTE = ["por_confirmar", "confirmado", "atendido", "revisar", "descartado"] as const;
export const ESTADOS_TARJETA = ["borrador", "verificada", "revisada"] as const;
export const ESTADOS_ALERTA = ["borrador", "aprobada", "enviada", "descartada"] as const;
export const RIESGOS = ["bajo", "medio", "alto"] as const;

/** Tarjetas que el bot y el menú pueden enviar. */
export const ESTADOS_TARJETA_ENVIABLES = ["verificada", "revisada"] as const;

/* ======================================================================
 * 1. Mensaje entrante (audio o texto -> Gemini -> JSON)
 *    Una sola llamada por mensaje: intención + datos del reporte + ids de tarjetas.
 * ==================================================================== */
export const ReporteDatos = z.object({
  tipo_reporte: z.enum(["agua", "dano", "forraje", "otro"]),
  comunidad_mencionada: z.string().nullable(),
  // días sin agua (tipo agua) o sin forraje (tipo forraje). null si no lo dijeron.
  dias_sin_recurso: z.number().int().min(0).max(60).nullable(),
  familias_afectadas: z.number().int().min(0).nullable(),
  animales_afectados: z.number().int().min(0).nullable(),
  factor: Factor.nullable(),
});
export type ReporteDatos = z.infer<typeof ReporteDatos>;

const MensajeEntranteBase = z.object({
  transcripcion: z.string().min(1),
  idioma: z.enum(["es", "qu", "ay", "mixto", "desconocido"]),
  intencion: z.enum(["reporte", "pregunta", "otro"]),
  reporte: ReporteDatos.nullable(), // solo si intencion = "reporte"
  confianza: z.number().min(0).max(1),
});

/**
 * Esquema de MensajeEntrante con la lista CERRADA de ids de tarjetas enviables
 * (estado verificada o revisada), construida en tiempo de ejecución desde la base.
 * Usar el mismo esquema para `responseJsonSchema` (z.toJSONSchema) y para `parse`.
 */
export function esquemaMensajeEntrante(idsEnviables: readonly string[]) {
  const tarjeta_ids = idsEnviables.length > 0
    ? z.array(z.enum(idsEnviables as [string, ...string[]])).max(3)
    : z.array(z.string()).max(0); // sin tarjetas enviables, Gemini no puede elegir ninguna
  return MensajeEntranteBase.extend({ tarjeta_ids });
}
export type MensajeEntrante = z.infer<typeof MensajeEntranteBase> & { tarjeta_ids: string[] };

export const UMBRAL_CONFIANZA_REPORTE = 0.6; // por debajo -> pedir repetir; al segundo fallo -> 'revisar'

/* ======================================================================
 * 2. Boletín del Senamhi (PDF -> Gemini -> JSON)
 * ==================================================================== */
const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const AvisoGemini = z.object({
  encontrado: z.boolean(),
  zona: z.string().nullable(),                      // ej. "Altiplano Central"
  estacion: z.string().nullable(),                  // ej. "Oruro-Ciudad"
  periodo_inicio: fechaISO.nullable(),
  periodo_fin: fechaISO.nullable(),
  fenomeno: z.enum(["helada", "nevada", "sequia", "ninguno"]),
  temp_minima_c: z.number().nullable(),             // mínima de la zona/estación, no de toda la macrorregión
  // Orden importante: primero las citas LITERALES y después el nivel (el modelo genera en este orden).
  cita_evento: z.string().max(200).nullable(),      // LITERAL del boletín
  cita_riesgo: z.string().max(200).nullable(),      // LITERAL: la frase del riesgo de HELADA
  // Riesgo de HELADA según Gemini. El código NO lo usa si puede leerlo de cita_riesgo (ver riesgoDesdeCita).
  riesgo_helada: z.enum(RIESGOS).nullable(),
  nivel_senamhi: z.enum(["amarillo", "naranja", "rojo"]).nullable(),
  confianza: z.number().min(0).max(1),
});
export type AvisoGemini = z.infer<typeof AvisoGemini>;

// Umbral de DEMO, no oficial: solo se usa si el boletín no trae nivel ni riesgo.
export const UMBRAL_HELADA_DEMO_C = -5;
export const UMBRAL_CONFIANZA_AVISO = 0.7;

export type DecisionAlerta = { alertar: boolean; motivo: string; riesgo: Riesgo | null };
export type Riesgo = (typeof RIESGOS)[number];

/**
 * Lee el nivel de riesgo de HELADA desde la cita LITERAL del boletín (la que ve la técnica junto al PDF).
 * "Riesgo MEDIO por helada…" -> "medio" · "Riesgo MEDIO A ALTO por helada…" -> "alto" (valor superior).
 * Devuelve null si la cita no habla de helada o no trae un nivel reconocible.
 * Motivo (prueba del sáb 21/11): Gemini citó bien "Riesgo MEDIO por helada tardía" pero devolvió
 * riesgo_helada = "alto", tomado de la fila del viento. La cita es verificable; el campo suelto, no.
 */
export function riesgoDesdeCita(cita: string | null): Riesgo | null {
  if (!cita || !/helad/i.test(cita)) return null;
  const m = cita.match(/riesgo\s+(bajo|medio|alto)(?:\s+a\s+(bajo|medio|alto))?/i);
  if (!m) return null;
  return (m[2] ?? m[1]).toLowerCase() as Riesgo;
}

/** El CÓDIGO decide si se prepara una alerta; Gemini solo extrae. Siempre pasa por aprobación humana. */
export function decidirAlerta(a: AvisoGemini): DecisionAlerta {
  // El riesgo sale de la CITA literal; el campo de Gemini solo es respaldo si la cita no trae nivel.
  const deCita = riesgoDesdeCita(a.cita_riesgo);
  const riesgo = deCita ?? a.riesgo_helada;
  const nota = deCita && a.riesgo_helada && deCita !== a.riesgo_helada
    ? ` (Gemini indicó "${a.riesgo_helada}", pero la cita dice "${deCita}": se usa la cita.)`
    : !deCita && a.riesgo_helada ? " (nivel tomado del campo de Gemini: comprobar en el PDF.)" : "";
  const no = (motivo: string): DecisionAlerta => ({ alertar: false, motivo, riesgo });
  const si = (motivo: string): DecisionAlerta => ({ alertar: true, motivo: motivo + nota, riesgo });

  if (!a.encontrado) return no("El boletín no trae información para la zona.");
  if (a.confianza < UMBRAL_CONFIANZA_AVISO) return no(`Confianza de la extracción ${a.confianza} < ${UMBRAL_CONFIANZA_AVISO}: revisar a mano.`);
  if (a.fenomeno === "ninguno") return no("El boletín no indica helada, nevada ni sequía para la zona.");
  if (!a.cita_evento) return no("Falta la cita textual del evento: sin cita no hay alerta.");
  if (a.nivel_senamhi) return si(`El Senamhi emitió nivel ${a.nivel_senamhi}.`);
  if (a.fenomeno === "helada" && (riesgo === "medio" || riesgo === "alto")) return si(`El boletín asigna riesgo ${riesgo} de helada.`);
  if (a.fenomeno === "helada" && riesgo === null && a.temp_minima_c !== null && a.temp_minima_c <= UMBRAL_HELADA_DEMO_C)
    return si(`Sin nivel de riesgo en el boletín; mínima ${a.temp_minima_c} °C ≤ umbral de demo ${UMBRAL_HELADA_DEMO_C} °C.`);
  return no("El riesgo indicado no llega a medio y no hay nivel del Senamhi.");
}
export const debeAlertar = (a: AvisoGemini) => decidirAlerta(a).alertar;

/* ======================================================================
 * 3. Tarjeta "qué hacer" (la escribe el equipo; Gemini solo elige id)
 *    v0.3: una fuente por paso (step_sources) y `author` = autor del texto o guía de origen
 *    (la autoría que se menciona). verificada/revisada exige verified_by (sin regla contra author).
 * ==================================================================== */
export const contarPalabras = (s: string) => s.trim().split(/\s+/).length;

export const FuentePaso = z.object({
  doc: z.string().min(3),   // p. ej. "Senamhi–INSA, Boletín agrometeorológico Altiplano, decena 14–23 nov 2026"
  page: z.string().min(1),  // página del VISOR de PDF, p. ej. "p. 6"
});
export type FuentePaso = z.infer<typeof FuentePaso>;

/** v0.4: límites de pasos por tarjeta. Las 6 tarjetas v0.3 tienen 3. */
export const PASOS_MIN = 3;
export const PASOS_MAX = 5;
export const PALABRAS_MAX_PASO = 18;

/**
 * v0.4: un texto corto con su fuente ("Por qué importa", cada "Evita").
 * La fuente es obligatoria: si la frase no está en la página citada, no entra.
 */
export const TextoConFuente = z.object({
  texto: z.string().min(3).max(280),
  fuente: FuentePaso,
});
export type TextoConFuente = z.infer<typeof TextoConFuente>;

/** v0.4: "Pide ayuda si…": cuándo avisar al municipio. Fuente opcional (puede ser el texto fijo del equipo). */
export const PedirAyuda = z.object({
  texto: z.string().min(3).max(280),
  fuente: FuentePaso.nullable().default(null),
});
export type PedirAyuda = z.infer<typeof PedirAyuda>;

/** Texto fijo de "Pide ayuda si…" cuando la tarjeta no trae uno propio. No es un consejo: dice cómo avisar. */
export const PEDIR_AYUDA_FIJO =
  "Si hay daños, animales enfermos o te quedas sin agua, avisa a la unidad de gestión de riesgos de tu municipio. También puedes responder con un audio al bot.";

export const Tarjeta = z.object({
  id: z.string().regex(/^(helada|sequia|nevada)-(antes_familia|antes_animales|durante|despues)-\d{2}$/),
  hazard: Amenaza,
  phase: Fase,
  title: z.string().min(3).max(80),
  // v0.4: 3 a 5 pasos, imperativo, máx. 18 palabras, sin dosis ni medicinas ni diagnósticos
  steps: z.array(z.string().min(1)).min(PASOS_MIN).max(PASOS_MAX).refine(
    (s) => s.every((x) => contarPalabras(x) <= PALABRAS_MAX_PASO),
    `Cada paso debe tener ${PALABRAS_MAX_PASO} palabras o menos`,
  ),
  // una fuente por paso, en el mismo orden y con el mismo largo que steps (ver refine abajo)
  step_sources: z.array(FuentePaso).min(PASOS_MIN).max(PASOS_MAX),
  // v0.4: todos opcionales; las tarjetas v0.3 siguen valiendo sin ellos
  por_que: TextoConFuente.nullable().optional(),                // "Por qué importa": 1 o 2 frases
  evitar: z.array(TextoConFuente).max(2).nullable().optional(), // "Evita": 0 a 2 cosas, solo si la fuente lo dice
  pedir_ayuda: PedirAyuda.nullable().optional(),                // sin él se muestra PEDIR_AYUDA_FIJO (textoPedirAyuda)
  factor_tags: z.array(Factor).default([]),
  source_doc: z.string().min(3),        // resumen para el pie de la tarjeta
  source_page: z.string().min(1),       // número del visor de PDF
  source_url: z.string().url().optional(),
  author: z.string().min(1),            // autor del texto o guía de origen, p. ej. "FAO Bolivia" (es la autoría que se menciona)
  verified_by: z.string().nullable().default(null), // persona del equipo que cotejó cada paso con su fuente
  reviewed_by: z.string().nullable().default(null), // revisor técnico externo (opcional)
  status: z.enum(ESTADOS_TARJETA).default("borrador"),
  // Rutas en Storage (bucket 'tarjetas' / 'audios'). Las rellenan los scripts, no el CSV.
  header_image_path: z.string().nullable().default(null), // lessons/<id>/header.jpg|webp
  // lessons/<id>/paso1..5.webp por posición; null o ausente = ícono de respaldo para ese paso
  step_image_paths: z.array(z.string().nullable()).max(PASOS_MAX).default([]),
  card_image_path: z.string().nullable().default(null),   // PNG 1080×1350 exportado (ver huellaTarjeta)
  audio_ogg_path: z.string().nullable().default(null),    // WhatsApp/Telegram (Opus mono 32k)
  audio_mp3_path: z.string().nullable().default(null),    // web (64k)
})
  .refine((t) => t.step_sources.length === t.steps.length, "Debe haber una fuente por paso (step_sources y steps del mismo largo)")
  .refine((t) => t.status === "borrador" || !!t.verified_by, "verificada/revisada exige verified_by")
  .refine((t) => t.status !== "revisada" || !!t.reviewed_by, "Una tarjeta revisada necesita revisor");
export type Tarjeta = z.infer<typeof Tarjeta>;

/** v0.4: texto de "Pide ayuda si…" que se muestra (el de la tarjeta o el fijo). */
export const textoPedirAyuda = (t: Pick<Tarjeta, "pedir_ayuda">) => t.pedir_ayuda?.texto ?? PEDIR_AYUDA_FIJO;

/** v0.4: true si la tarjeta trae alguna sección nueva (por qué, evita o pide ayuda propio). */
export const tieneSeccionesV04 = (t: Pick<Tarjeta, "por_que" | "evitar" | "pedir_ayuda">) =>
  !!t.por_que || (t.evitar?.length ?? 0) > 0 || !!t.pedir_ayuda;

/** Etiqueta obligatoria de toda tarjeta en borrador que se muestre (solo con DEMO_PERMITIR_BORRADOR=1). */
export const ETIQUETA_BORRADOR = "BORRADOR · sin verificar";

/** Etiqueta pública del estado de la tarjeta. */
export function etiquetaEstadoTarjeta(t: Pick<Tarjeta, "status" | "reviewed_by">): string {
  if (t.status === "revisada") return `Revisada por ${t.reviewed_by}`;
  if (t.status === "verificada") return "Verificada contra fuente";
  return ETIQUETA_BORRADOR;
}

/**
 * Menú fijo, sin IA. Solo se envían las tarjetas publicables de cada lista (las demás se saltan).
 * v0.4: tarjetas nuevas al final de cada lista (no cambian lo que se ve hoy) y la opción Nevada.
 */
export const MENU = {
  agua:      { titulo: "💧 Agua",      antes: ["sequia-antes_familia-01"],                             ahora: ["sequia-durante-01", "sequia-durante-03"] },
  animales:  { titulo: "🦙 Animales",  antes: ["sequia-antes_animales-01", "helada-antes_animales-01"], ahora: ["sequia-durante-01", "helada-durante-01", "sequia-durante-04", "sequia-despues-01"] },
  // helada-durante-01 trata de animales desde la v0.3: Cultivos no la muestra.
  cultivos:  { titulo: "🌱 Cultivos",  antes: ["helada-antes_familia-01"],                             ahora: ["helada-antes_familia-01", "sequia-durante-02", "helada-despues-01"] },
  nevada:    { titulo: "❄️ Nevada",    antes: ["nevada-antes_animales-01"],                            ahora: [] },
} as const;
export type OpcionMenu = keyof typeof MENU;

/**
 * Opciones del menú que se muestran: las que tienen al menos una tarjeta enviable (antes o ahora).
 * Así una opción nueva (p. ej. Nevada) aparece recién cuando su tarjeta está verificada.
 * Si no hay ninguna tarjeta enviable (base vacía o caída), se muestran todas: el bot responde "sin tarjetas".
 */
export function menuVisible(idsEnviables: ReadonlySet<string>): OpcionMenu[] {
  const todas = Object.keys(MENU) as OpcionMenu[];
  const con = todas.filter((op) => [...MENU[op].antes, ...MENU[op].ahora].some((id) => idsEnviables.has(id)));
  return con.length ? con : todas;
}

/** WhatsApp admite 3 botones por mensaje: con más opciones el menú va como lista (hasta 10 filas). */
export const MAX_BOTONES = 3;

/**
 * Tarjeta que acompaña a una alerta: regla fija (amenaza + fase antes_familia).
 * Si esa tarjeta no está en estado enviable, la alerta NO se puede aprobar hasta verificarla.
 */
// Tarjeta "qué hacer" de cada amenaza. Nevada usa la de animales: es la única tarjeta de nevada (dom 22/11).
const TARJETA_DE_ALERTA: Record<Amenaza, string> = {
  helada: "helada-antes_familia-01",
  sequia: "sequia-antes_familia-01",
  nevada: "nevada-antes_animales-01",
};
export function tarjetaParaAlerta(hazard: Amenaza): string {
  return TARJETA_DE_ALERTA[hazard];
}

/* ======================================================================
 * 4. Mensaje de alerta (lo arma el CÓDIGO con plantilla, nunca la IA)
 * ==================================================================== */
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
export const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};
/** "14 al 23 de noviembre de 2026" si coinciden mes y año; si no, ambas fechas completas. */
export const rangoFechas = (ini: string, fin: string) =>
  ini.slice(0, 7) === fin.slice(0, 7) ? `${Number(ini.slice(8))} al ${fechaLarga(fin)}` : `${fechaLarga(ini)} al ${fechaLarga(fin)}`;

/* ----------------------------------------------------------------------
 * v0.4 (H3): nivel de la alerta. LA GRAVEDAD LA PONE EL SENAMHI, NUNCA NOSOTROS.
 *   nivel del Senamhi "rojo"    o riesgo de helada "alto"  → roja    ("Actúa hoy")
 *   nivel del Senamhi "naranja" o riesgo de helada "medio" → naranja ("Prepárate desde hoy")
 *   amarillo, riesgo bajo o sin dato → null (sin color: no se sube la gravedad por nuestra cuenta)
 * Se toma el MÁS ALTO de los dos datos. El riesgo es el que guarda `alerts.risk_level`
 * (sale de la cita literal, ver riesgoDesdeCita/decidirAlerta).
 * ------------------------------------------------------------------- */
export const NIVELES_ALERTA = ["roja", "naranja"] as const;
export type NivelAlerta = (typeof NIVELES_ALERTA)[number];
export type NivelSenamhi = "amarillo" | "naranja" | "rojo";

/** Nivel visual de una alerta a partir de lo que guarda la fila `alerts` (risk_level, senamhi_level). */
export function nivelAlerta(a: { risk_level?: Riesgo | null; senamhi_level?: NivelSenamhi | null }): NivelAlerta | null {
  if (a.senamhi_level === "rojo" || a.risk_level === "alto") return "roja";
  if (a.senamhi_level === "naranja" || a.risk_level === "medio") return "naranja";
  return null;
}

/** El mismo nivel calculado desde la extracción del boletín (riesgo desde la cita, como decidirAlerta). */
export const nivelAlertaDeAviso = (a: AvisoGemini): NivelAlerta | null =>
  nivelAlerta({ risk_level: decidirAlerta(a).riesgo, senamhi_level: a.nivel_senamhi });

const NOMBRE_FENOMENO: Record<AvisoGemini["fenomeno"], { normal: string; fuerte: string }> = {
  helada: { normal: "HELADA", fuerte: "HELADA FUERTE" },
  nevada: { normal: "NEVADA", fuerte: "NEVADA FUERTE" },
  sequia: { normal: "SEQUÍA", fuerte: "SEQUÍA" },
  ninguno: { normal: "AVISO", fuerte: "AVISO" },
};

/** "🔴 ALERTA ROJA · HELADA FUERTE" · "🟠 ALERTA NARANJA · HELADA" · sin nivel: "⚠️ AVISO · HELADA". */
export function encabezadoAlerta(nivel: NivelAlerta | null, fenomeno: AvisoGemini["fenomeno"]): string {
  const n = NOMBRE_FENOMENO[fenomeno];
  if (nivel === "roja") return `🔴 ALERTA ROJA · ${n.fuerte}`;
  if (nivel === "naranja") return `🟠 ALERTA NARANJA · ${n.normal}`;
  return `⚠️ AVISO · ${n.normal}`;
}

/** Tono según el nivel: roja "Actúa hoy.", naranja "Prepárate desde hoy.", sin nivel "Prepárate.". */
export const tonoAlerta = (nivel: NivelAlerta | null) =>
  nivel === "roja" ? "Actúa hoy." : nivel === "naranja" ? "Prepárate desde hoy." : "Prepárate.";

type TarjetaDeAlerta = Pick<Tarjeta, "steps" | "source_doc" | "source_page" | "status" | "reviewed_by">;

/**
 * Mensaje de la alerta v2 (WhatsApp, Telegram y web), lo arma el CÓDIGO con plantilla, nunca la IA.
 * - Encabezado por nivel (nivelAlertaDeAviso). Zona y período del boletín.
 * - Cifras: SOLO dentro de las citas LITERALES del boletín (cita_evento, cita_riesgo). Nada se calcula ni se resume.
 * - "QUÉ HACER HOY" con los pasos de la tarjeta de la regla y su fuente.
 * - Fuente oficial y enlace al PDF ORIGINAL del Senamhi (bulletins.source_url), si se descargó de su sitio.
 */
export function construirMensajeAlerta(p: {
  aviso: AvisoGemini;                       // debe haber pasado decidirAlerta
  // null = la tarjeta de la regla aún no es publicable: el mensaje sale sin "Qué hacer" y la alerta NO se puede aprobar
  tarjeta: TarjetaDeAlerta | null;
  boletinEsEjemplo: boolean;
  simulacro?: boolean;                      // comunicado manual de práctica: el encabezado dice SIMULACRO
  comunicado?: boolean;                     // comunicado de última hora cargado a mano (no el boletín decenal)
  boletinUrl?: string | null;               // bulletins.source_url; null si el PDF se subió a mano
  conAudio?: boolean;                       // true si la alerta lleva audio (no cambia el texto: decisión de A, dom 22/11)
}): string {
  const { aviso, tarjeta, boletinEsEjemplo } = p;
  if (!aviso.cita_evento) throw new Error("Sin cita_evento no se arma la alerta");
  const nivel = nivelAlertaDeAviso(aviso);
  const periodo = aviso.periodo_inicio && aviso.periodo_fin ? rangoFechas(aviso.periodo_inicio, aviso.periodo_fin) : null;
  const lugarYFecha = [aviso.zona, periodo].filter(Boolean).join(" · ");
  const queHacer = tarjeta
    ? [
        "",
        nivel === "roja" ? "QUÉ HACER HOY" : "QUÉ HACER",
        ...tarjeta.steps.map((paso, i) => `${i + 1}) ${paso}`),
        // Sin toLowerCase: la etiqueta de borrador debe salir tal cual ("BORRADOR · sin verificar").
        `(Tarjeta: ${etiquetaEstadoTarjeta(tarjeta)}. ${tarjeta.source_doc}, ${tarjeta.source_page})`, // source_page ya trae "p."
      ]
    : [];
  return [
    `${p.simulacro ? "SIMULACRO · " : ""}${encabezadoAlerta(nivel, aviso.fenomeno)}${boletinEsEjemplo && !p.simulacro ? " (EJEMPLO con boletín histórico)" : ""}`,
    lugarYFecha || null,
    tonoAlerta(nivel),
    `El Senamhi dice: "${aviso.cita_evento}"`,
    aviso.cita_riesgo ? `"${aviso.cita_riesgo}"` : null,
    ...queHacer,
    "",
    p.comunicado ? "Fuente oficial: comunicado del Senamhi." : "Fuente oficial: Senamhi, boletín agrometeorológico decenal del Altiplano.",
    p.boletinUrl ? `${p.comunicado ? "Ver el comunicado original" : "Ver el boletín original"}: ${p.boletinUrl}` : null,
    "Si hay daños, responde con un audio.",
  ].filter((l) => l !== null).join("\n");
}

/** Quita la lista entre paréntesis de la zona para leerla en voz alta: "Altiplano Central (Oruro, …)" → "Altiplano Central". */
const zonaHablada = (zona: string | null) => zona?.replace(/\s*\([^)]*\)/g, "").trim() || null;

/**
 * Guion del audio de la alerta (~20 s). Sin enlace y sin mencionar la voz sintética (decisión de A, dom 22/11).
 * El encabezado se repite al inicio para captar la atención. Sin cifras propias: solo fechas del boletín y los pasos.
 */
export function guionAudioAlerta(aviso: AvisoGemini, tarjeta: Pick<Tarjeta, "steps"> | null): string {
  const nivel = nivelAlertaDeAviso(aviso);
  const fenomeno = { helada: "helada", nevada: "nevada", sequia: "sequía", ninguno: "evento" }[aviso.fenomeno];
  const que = nivel === "roja"
    ? `Alerta roja por ${fenomeno}${aviso.fenomeno === "sequia" ? "" : " fuerte"}`
    : nivel === "naranja" ? `Alerta naranja por ${fenomeno}` : `Aviso de ${fenomeno}`;
  const zona = zonaHablada(aviso.zona);
  const periodo = aviso.periodo_inicio && aviso.periodo_fin ? rangoFechas(aviso.periodo_inicio, aviso.periodo_fin) : null;
  const pasos = tarjeta ? tarjeta.steps.map((s) => s.trim().replace(/[.;:]+$/, "") + ".").join(" ") : "";
  return [
    `Atención. ${nivel === "roja" ? "Alerta roja." : nivel === "naranja" ? "Alerta naranja." : "Aviso."}`,
    `${que}${zona ? ` en el ${zona.replace(/^el\s+/i, "")}` : ""}${periodo ? `, del ${periodo}` : ""}. Lo anuncia el Senamhi.`,
    pasos ? `${nivel === "roja" ? "Hoy mismo" : "Desde hoy"}: ${pasos}` : null,
    "El enlace al boletín está en el mensaje.",
  ].filter(Boolean).join(" ");
}

/* ======================================================================
 * 5. Bot: entrada y salida comunes a los 3 canales
 *    procesarMensaje(entrada) -> SalidaBot[]; cada adaptador traduce SalidaBot a su canal.
 * ==================================================================== */
export const EntradaBot = z.object({
  canal: Canal,
  usuarioId: z.string().min(1),          // teléfono, chat_id o id de cookie
  mensajeId: z.string().min(1),          // para deduplicar
  tipo: z.enum(["texto", "audio", "boton"]),
  texto: z.string().max(1000).optional(),
  audio: z.object({ base64: z.string(), mime: z.string() }).optional(),
  botonId: z.string().max(64).optional(),
});
export type EntradaBot = z.infer<typeof EntradaBot>;

// Límites de WhatsApp (los más estrictos): 3 botones de 20 caracteres; listas de 10 filas de 24 caracteres.
// Telegram limita el id del botón (callback_data) a 64 bytes: ids ASCII de 64 como máximo y nunca dos UUID.
const Boton = z.object({ id: z.string().max(64), titulo: z.string().min(1).max(20) });
const FilaLista = z.object({ id: z.string().max(64), titulo: z.string().min(1).max(24), descripcion: z.string().max(72).optional() });

export const SalidaBot = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("texto"), texto: z.string().min(1).max(4096) }),
  z.object({ tipo: z.literal("audio"), oggUrl: z.string().url(), mp3Url: z.string().url().optional() }),
  z.object({ tipo: z.literal("botones"), texto: z.string().min(1).max(1024), botones: z.array(Boton).min(1).max(3) }),
  z.object({ tipo: z.literal("lista"), texto: z.string().min(1).max(1024), boton: z.string().min(1).max(20), filas: z.array(FilaLista).min(1).max(10) }),
  z.object({
    tipo: z.literal("tarjeta"),
    id: z.string(),
    titulo: z.string(),
    pasos: z.array(z.string()).min(PASOS_MIN).max(PASOS_MAX), // v0.4: 3 a 5 (antes, tupla de 3)
    fuente: z.string(),
    pagina: z.string(),
    etiquetaEstado: z.string(),
    fuenteUrl: z.string().url().optional(),
    audioOggUrl: z.string().url().optional(),
    audioMp3Url: z.string().url().optional(),
    imagenUrl: z.string().url().optional(),
    // v0.4 (opcional): el bot sigue enviando el resumen; lo completo está en la web.
    urlCompleta: z.string().url().optional(), // "Ver tarjeta completa": <APP_URL>/tarjetas/<id>
  }),
]);
export type SalidaBot = z.infer<typeof SalidaBot>;

/** POST /api/bot/web — contrato entre /probar (B) y el bot (A). El usuarioId sale de la cookie, no del body. */
export const BotWebRequest = z.object({
  tipo: z.enum(["texto", "audio", "boton"]),
  texto: z.string().max(1000).optional(),
  audio: z.object({ base64: z.string().max(3_500_000), mime: z.string() }).optional(), // ~60 s de WAV 16 kHz en base64
  botonId: z.string().max(64).optional(),
});
export const BotWebResponse = z.object({ respuestas: z.array(SalidaBot) });
export type BotWebRequest = z.infer<typeof BotWebRequest>;
export type BotWebResponse = z.infer<typeof BotWebResponse>;

/** Textos fijos del bot (un solo lugar para no improvisar mensajes). */
export const MENSAJES = {
  sinTarjeta: "No tengo una recomendación para eso. Consulta al técnico de tu municipio.",
  sinMedicinas: "No damos medicinas, dosis ni diagnósticos. Consulta al técnico de tu municipio o al SENASAG.",
  topeAgotado: "El simulador llegó a su límite de hoy. Escribe 0 para usar el menú.",
  noEntendi: "No te entendí bien. ¿Puedes mandar otro audio más corto?",
  baja: "Listo, ya no recibirás avisos. Si quieres volver, escribe ALERTA.",
  soloAudioTexto: "Por ahora solo recibo audios o texto.",
  ocupado: "Sistema ocupado, escribe 0 para usar el menú.",
  muchosMensajes: "Recibí muchos mensajes seguidos. Espera unos minutos, por favor.",
  error: "Ocurrió un error. Escribe 0 para ver el menú.",
} as const;

/** Límites del bot. mensajesPorVentana cuenta solo mensajes libres (los que usan IA); los botones no cuentan. El tope diario sale de PROBAR_TOPE_DIARIO. */
export const LIMITES = { mensajesPorVentana: 10, ventanaMin: 10, audioMaxSeg: 60, geminiTimeoutMs: 15_000 } as const;
