import {
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  CircleX,
  FilePen,
  FlaskConical,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/** Nivel de urgencia de la prioridad pública (mismos nombres que `components/mapa/colores.ts`). */
export type NivelUrgencia = "rojo" | "naranja" | "amarillo" | "verde" | "gris";

export type TipoInsignia =
  | "ejemplo"
  | "verificada"
  | "revisada"
  | "borrador"
  | "llego"
  | "no-llego"
  | "sin-respuesta"
  | "alerta-roja"
  | "alerta-naranja"
  | `nivel-${NivelUrgencia}`;

const TIPOS: Record<TipoInsignia, { texto: string; clases: string; Icono: LucideIcon }> = {
  ejemplo: { texto: "EJEMPLO", clases: "bg-ocre-suave text-ocre-tinta border-ocre", Icono: FlaskConical },
  verificada: { texto: "Verificada contra fuente", clases: "bg-verde-suave text-verde-tinta border-verde", Icono: BadgeCheck },
  revisada: { texto: "Revisada", clases: "bg-verde-suave text-verde-tinta border-verde", Icono: BadgeCheck },
  borrador: { texto: "BORRADOR · sin verificar", clases: "bg-roja text-white border-roja", Icono: FilePen },
  llego: { texto: "Llegó", clases: "bg-verde-suave text-verde-tinta border-verde", Icono: CircleCheck },
  "no-llego": { texto: "No llegó", clases: "bg-roja-suave text-roja-tinta border-roja", Icono: CircleX },
  "sin-respuesta": { texto: "Sin respuesta", clases: "bg-gris-suave text-gris-tinta border-gris", Icono: CircleDashed },
  "alerta-roja": { texto: "ALERTA ROJA", clases: "bg-roja text-white border-roja", Icono: OctagonAlert },
  "alerta-naranja": { texto: "ALERTA NARANJA", clases: "bg-naranja text-white border-naranja", Icono: TriangleAlert },
  "nivel-rojo": { texto: "Muy alta", clases: "bg-roja text-white border-roja", Icono: OctagonAlert },
  "nivel-naranja": { texto: "Alta", clases: "bg-naranja text-white border-naranja", Icono: TriangleAlert },
  "nivel-amarillo": { texto: "Media", clases: "bg-ocre text-white border-ocre", Icono: TriangleAlert },
  "nivel-verde": { texto: "Baja", clases: "bg-verde text-white border-verde", Icono: CircleCheck },
  "nivel-gris": { texto: "Sin reportes activos", clases: "bg-gris-suave text-gris-tinta border-gris", Icono: CircleDashed },
};

/**
 * Etiqueta corta: color + palabra + ícono (nunca solo color).
 * `children` reemplaza el texto por defecto (p. ej. "Revisada por la técnica").
 */
export function Insignia({ tipo, children, className }: { tipo: TipoInsignia; children?: ReactNode; className?: string }) {
  const { texto, clases, Icono } = TIPOS[tipo];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold leading-5",
        clases,
        className,
      )}
    >
      <Icono aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.25} />
      {children ?? texto}
    </span>
  );
}

/** Texto por defecto de una insignia (para `aria-label`, títulos o leyendas). */
export const textoInsignia = (tipo: TipoInsignia) => TIPOS[tipo].texto;
