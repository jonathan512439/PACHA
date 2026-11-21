import type { PrioridadComunidad } from "@/contratos/prioridad";

export const COLOR_URGENCIA = { rojo: "#dc2626", naranja: "#ea580c", amarillo: "#ca8a04", verde: "#16a34a", gris: "#9ca3af" } as const;
export const NOMBRE_URGENCIA = { rojo: "Muy alta", naranja: "Alta", amarillo: "Media", verde: "Baja", gris: "Sin reportes activos" } as const;

export const urgenciaDe = (p: PrioridadComunidad) => (p.estado === "activa" ? p.urgencia : "gris");
