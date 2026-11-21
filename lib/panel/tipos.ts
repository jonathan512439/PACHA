export type EstadoReportePanel =
  | "por_confirmar"
  | "confirmado"
  | "atendido"
  | "revisar"
  | "descartado";

export type ReportePanel = {
  id: string;
  comunidad: string;
  comunidadEjemplo: boolean;
  tipo: "agua" | "dano" | "forraje" | "otro";
  estado: EstadoReportePanel;
  transcripcion: string | null;
  audioUrl: string | null;
  puntaje: number | null;
  fecha: string;
  atendido: string | null;
  diasSinRecurso: number | null;
  familias: number | null;
  animales: number | null;
};
