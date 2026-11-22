import { CircleCheck, CircleX, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * `roja` y `naranja`: banda llena del aviso oficial (la gravedad la pone el Senamhi, nunca nosotros).
 * `info`, `exito`, `error`, `atencion`: avisos suaves de la interfaz (formularios, estados, notas).
 */
export type NivelAviso = "roja" | "naranja" | "info" | "exito" | "error" | "atencion";

const NIVELES: Record<NivelAviso, { clases: string; Icono: LucideIcon; palabra?: string; role: "alert" | "status" | "note" }> = {
  roja: { clases: "bg-roja text-white border-roja-tinta", Icono: OctagonAlert, palabra: "ALERTA ROJA", role: "note" },
  naranja: { clases: "bg-naranja text-white border-naranja-tinta", Icono: TriangleAlert, palabra: "ALERTA NARANJA", role: "note" },
  info: { clases: "bg-marca-suave text-tinta border-marca", Icono: Info, role: "note" },
  exito: { clases: "bg-verde-suave text-verde-tinta border-verde", Icono: CircleCheck, role: "status" },
  error: { clases: "bg-roja-suave text-roja-tinta border-roja", Icono: CircleX, role: "alert" },
  atencion: { clases: "bg-ocre-suave text-ocre-tinta border-ocre", Icono: TriangleAlert, role: "note" },
};

/**
 * Banda de aviso: ícono + palabra + color. En `roja`, el ícono late suave (se apaga con reduce-motion).
 * - `titulo`: la línea fuerte. En roja/naranja va después de "ALERTA ROJA ·" (p. ej. "HELADA FUERTE").
 * - `children`: el detalle (cita del boletín, fechas, zona).
 * - `accion`: un enlace o botón al pie (p. ej. "Ver qué hacer").
 * El rol ARIA: `error` anuncia (alert), `exito` es status; los demás no interrumpen al lector de pantalla.
 */
export function Aviso({
  nivel,
  titulo,
  children,
  accion,
  className,
  role,
}: {
  nivel: NivelAviso;
  titulo?: ReactNode;
  children?: ReactNode;
  accion?: ReactNode;
  className?: string;
  role?: "alert" | "status" | "note" | "region";
}) {
  const { clases, Icono, palabra, role: rolPorDefecto } = NIVELES[nivel];
  const fuerte = nivel === "roja" || nivel === "naranja";
  return (
    <div
      role={role ?? rolPorDefecto}
      className={cx("flex gap-3 rounded-xl border-l-[6px] p-4 [&_a]:underline [&_a]:font-semibold", fuerte ? "border-y-0 border-r-0" : "border", clases, className)}
    >
      <Icono
        aria-hidden="true"
        className={cx("mt-0.5 shrink-0", fuerte ? "size-7" : "size-5", false)}
        strokeWidth={2.25}
      />
      <div className="min-w-0 flex-1 space-y-1">
        {(palabra || titulo) && (
          <p className={cx("font-bold leading-snug", fuerte ? "text-lg tracking-wide" : "text-base")}>
            {palabra}
            {palabra && titulo ? " · " : ""}
            {titulo}
          </p>
        )}
        {children && <div className={cx("text-sm leading-relaxed", fuerte ? "text-white" : undefined)}>{children}</div>}
        {accion && <div className="pt-1 text-sm font-semibold">{accion}</div>}
      </div>
    </div>
  );
}
