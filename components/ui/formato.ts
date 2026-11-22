/** Formatos de fecha y número para el público, siempre en hora de Bolivia. */
const ZONA = "America/La_Paz";

/** "22/11, 02:45" */
export const fechaHora = (d: Date | string) =>
  new Intl.DateTimeFormat("es-BO", { timeZone: ZONA, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(d),
  );

/** "22 de noviembre" */
export const fechaCorta = (d: Date | string) =>
  new Intl.DateTimeFormat("es-BO", { timeZone: ZONA, day: "numeric", month: "long" }).format(new Date(d));

/** Fecha de hoy en Bolivia como "AAAA-MM-DD" (para comparar con columnas `date`). */
export const hoyBolivia = (ahora = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);

/** 1234.5 → "1.234,5" */
export const numero = (n: number, decimales = 0) =>
  new Intl.NumberFormat("es-BO", { maximumFractionDigits: decimales, minimumFractionDigits: 0 }).format(n);
