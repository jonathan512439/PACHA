import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Número grande con su etiqueta: "6 · días sin agua". Cifras tabulares.
 * `detalle` va debajo en pequeño (p. ej. la fuente o "actualizado hace 10 s").
 * `tono` colorea solo el número (el nivel debe decirse también con palabras en la etiqueta o el detalle).
 */
export function Cifra({
  valor,
  etiqueta,
  detalle,
  unidad,
  tono = "tinta",
  tamano = "md",
  className,
}: {
  valor: ReactNode;
  etiqueta: ReactNode;
  detalle?: ReactNode;
  unidad?: ReactNode;
  tono?: "tinta" | "marca" | "roja" | "naranja" | "ocre" | "verde";
  tamano?: "md" | "lg";
  className?: string;
}) {
  const color = { tinta: "text-tinta", marca: "text-marca", roja: "text-roja", naranja: "text-naranja", ocre: "text-ocre", verde: "text-verde" }[tono];
  return (
    <div className={cx("flex flex-col", className)}>
      <span className={cx("cifras font-titulo font-semibold leading-none", tamano === "lg" ? "text-5xl" : "text-4xl", color)}>
        {valor}
        {unidad && <span className="ml-1 font-sans text-base font-medium text-tinta-2">{unidad}</span>}
      </span>
      <span className="mt-1.5 text-sm font-medium text-tinta">{etiqueta}</span>
      {detalle && <span className="mt-0.5 text-xs text-tinta-2">{detalle}</span>}
    </div>
  );
}
