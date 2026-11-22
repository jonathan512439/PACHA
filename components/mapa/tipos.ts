import type { Contador, EntregaVis, TipoProblema } from "@/lib/visibilidad-calculo";

export type NivelMapa = "rojo" | "naranja" | "amarillo" | "verde" | "gris";

/** Lo que el servidor le pasa al mapa por comunidad (serializable, sin datos personales). */
export type PuntoMapaVivo = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  families: number;
  is_example: boolean;
  is_test: boolean;
  nivel: NivelMapa;
  score: number | null;
  desglose: { criterio: string; aporte: number; nota?: string }[];
  problemas: TipoProblema[];
  /** Etiqueta del factor del reporte más reciente ("Pozo o vertiente seca"). */
  factor: string | null;
  sinAgua: Contador | null;
  sinForraje: Contador | null;
  ultimaEntrega: Pick<EntregaVis, "kind" | "quantity" | "unit" | "delivered_at" | "confirmed_by_community"> | null;
  sinEntrega: boolean;
};

/** Aviso vigente para la banda superior del mapa (null si no hay). */
export type AvisoMapa = { nivel: "roja" | "naranja" | "info"; amenaza: string; zona: string; fechas: string; simulacro?: boolean } | null;
