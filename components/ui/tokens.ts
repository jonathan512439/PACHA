/**
 * Paleta de PACHA (un solo tema claro). Espejo en TS de los `--color-*` de `app/globals.css`:
 * `tests/contraste.test.ts` comprueba que coinciden y que cada par texto/fondo cumple WCAG AA.
 * Úsala solo donde no llegan las clases de Tailwind (Leaflet, SVG, estilos en línea).
 */
export const COLORES = {
  // Superficies
  fondo: "#FAF7F2", // hueso cálido (fondo de página)
  superficie: "#FFFFFF", // tarjetas
  "superficie-2": "#F3EEE6", // cabeceras de tabla, zonas secundarias
  borde: "#E7E1D8", // decorativo (no transmite información)
  "borde-fuerte": "#857B72", // bordes que sí transmiten algo (campos, separadores clave): ≥ 3:1

  // Texto
  tinta: "#1C1917", // casi negro cálido
  "tinta-2": "#57534E", // secundario (cumple AA sobre blanco, hueso y superficie-2)

  // Marca
  marca: "#1E3A5F", // índigo andino: cabecera, enlaces, botón primario
  "marca-oscura": "#152A45", // hover del botón primario
  "marca-suave": "#E6EDF5", // fondo de avisos informativos

  acento: "#B45309", // terracota: detalles, pocas veces

  // Niveles (todos cumplen AA con texto blanco). Siempre con palabra + ícono, nunca solo color.
  roja: "#B91C1C",
  "roja-suave": "#FCECEC",
  "roja-tinta": "#7F1D1D",
  naranja: "#C2410C",
  "naranja-suave": "#FDEFE7",
  "naranja-tinta": "#7C2D12",
  ocre: "#A16207",
  "ocre-suave": "#FBF3DC",
  "ocre-tinta": "#713F12",
  verde: "#15803D",
  "verde-suave": "#E8F5EC",
  "verde-tinta": "#14532D",
  gris: "#78716C", // "sin reportes activos" (marcadores y puntos)
  "gris-suave": "#EFECE8",
  "gris-tinta": "#44403C",
} as const;

export type NombreColor = keyof typeof COLORES;

/** Nivel de urgencia de una comunidad (prioridad pública) → color del marcador/punto. */
export const COLOR_NIVEL = {
  rojo: COLORES.roja,
  naranja: COLORES.naranja,
  amarillo: COLORES.ocre,
  verde: COLORES.verde,
  gris: COLORES.gris,
} as const;
