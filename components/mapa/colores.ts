import { COLOR_NIVEL } from "@/components/ui/tokens";
import type { PrioridadComunidad } from "@/contratos/prioridad";

// Colores de los tokens (components/ui/tokens.ts): cumplen ≥ 3:1 como marcador y AA con texto blanco.
export const COLOR_URGENCIA = COLOR_NIVEL;
export const NOMBRE_URGENCIA = { rojo: "Muy alta", naranja: "Alta", amarillo: "Media", verde: "Baja", gris: "Sin reportes activos" } as const;

export const urgenciaDe = (p: PrioridadComunidad) => (p.estado === "activa" ? p.urgencia : "gris");
