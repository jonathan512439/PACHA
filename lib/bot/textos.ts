// Textos del bot que dependen de datos (los fijos están en MENSAJES, contratos/tipos.ts).
// Cortos y claros: muchas personas los escuchan o los leen con dificultad.

export const BIENVENIDA =
  "Hola 👋 Soy PACHA, el asistente de avisos para el Altiplano de Oruro. " +
  "Te mando los avisos oficiales del Senamhi y qué hacer, siempre con su fuente. " +
  "Los audios usan voz sintética. ¿Quieres recibir los avisos?";

export const RECHAZO = "Está bien, no te mandaré avisos. Si cambias de opinión, escribe ALERTA.";
export const ELIGE_COMUNIDAD = "¿De qué comunidad eres?";
export const SIN_COMUNIDADES = "Todavía no hay comunidades cargadas. Intenta más tarde.";

export const registrado = (comunidad: string) =>
  `Listo, quedaste registrado en ${comunidad}. Aquí te llegarán los avisos del Senamhi. ` +
  "Si tienes un problema, mándame un audio contando qué pasa. " +
  "Escribe 0 para ver qué hacer. Para dejar de recibir avisos, escribe BAJA.";

export const REACTIVADO = "Listo, vuelves a recibir los avisos. Escribe 0 para ver qué hacer.";
export const MENU = "¿Sobre qué quieres saber?";
export const MENU_MOMENTO = "¿Antes de que pase o está pasando ahora?";
export const MENU_SIN_TARJETAS = "Todavía no hay recomendaciones verificadas para eso. Consulta al técnico de tu municipio.";
export const OTRO =
  "Puedes mandarme un audio contando qué pasa en tu comunidad, o elegir un tema para saber qué hacer.";

export const REVISAR_HUMANO = "No pude entenderte bien. Una persona del municipio revisará tu mensaje.";
export const REPITE = "Está bien. Mándame otro audio contando qué pasa.";
export const REPORTE_YA_RESUELTO = "Ese reporte ya fue respondido.";
export const MIENTRAS_TANTO = "Mientras tanto, esto puede ayudar:";
export const ENTREGA_GRACIAS = "Gracias por confirmar. Queda registrado en el tablero público de entregas.";
export const ENTREGA_NO_LLEGO = "Gracias por avisar. Queda registrado públicamente que la entrega no llegó.";
export const ENTREGA_YA = "Esa entrega ya fue confirmada.";

export const reporteConfirmado = (comunidad: string) =>
  `Gracias. Tu reporte de ${comunidad} quedó registrado y ya cuenta en el mapa público de prioridades.`;

export const preguntaComunidad = "¿El reporte es para tu comunidad o para otra?";

const TIPO: Record<string, string> = { agua: "sin agua", forraje: "sin forraje", dano: "daños", otro: "problema" };

/** "Kantuta Pampa · sin agua hace 6 días · 40 familias" */
export function resumenReporte(p: {
  comunidad: string; tipo: string; dias: number | null; familias: number | null; animales: number | null;
}): string {
  const partes = [p.comunidad];
  const tipo = TIPO[p.tipo] ?? "problema";
  partes.push(p.dias !== null && (p.tipo === "agua" || p.tipo === "forraje") ? `${tipo} hace ${p.dias} días` : tipo);
  if (p.familias !== null) partes.push(`${p.familias} familias`);
  if (p.animales !== null) partes.push(`${p.animales} animales`);
  return `Entendí: ${partes.join(" · ")}. ¿Es correcto?`;
}

/** Recorta para los límites de botones (20) y filas de lista (24). */
export const recortar = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1) + "…");

/** Minúsculas, sin tildes ni signos: para comparar palabras clave y nombres. */
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
