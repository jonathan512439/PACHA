import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Caja blanca con borde fino y sombra suave (el contenedor de casi todo).
 * Ojo: no es la tarjeta "qué hacer" (esa es `components/tarjeta/TarjetaVisual`).
 * Si en el mismo archivo usas el tipo `Tarjeta` de contratos, impórtala como `Caja`.
 */
export function Tarjeta({
  children,
  titulo,
  accion,
  como: Etiqueta = "section",
  relleno = true,
  className,
  ...aria
}: {
  children: ReactNode;
  /** Título (h2) en la cabecera de la caja. */
  titulo?: ReactNode;
  /** Algo a la derecha del título: un enlace o un botón. */
  accion?: ReactNode;
  como?: "section" | "article" | "div" | "li" | "aside";
  /** false para tablas o listas que llegan al borde. */
  relleno?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
}) {
  return (
    <Etiqueta className={cx("rounded-xl border border-borde bg-superficie shadow-suave", className)} {...aria}>
      {(titulo || accion) && (
        <div className={cx("flex flex-wrap items-center gap-x-4 gap-y-1", relleno ? "px-5 pt-4" : "px-5 py-4 border-b border-borde")}>
          {titulo && <h2 className="text-lg font-semibold leading-snug">{titulo}</h2>}
          {accion && <div className="ml-auto text-sm">{accion}</div>}
        </div>
      )}
      <div className={relleno ? cx("px-5 pb-5", titulo || accion ? "pt-2" : "pt-5") : undefined}>{children}</div>
    </Etiqueta>
  );
}

export { Tarjeta as Caja };
