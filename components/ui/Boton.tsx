import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type VarianteBoton = "primario" | "secundario" | "peligro" | "fantasma";
export type TamanoBoton = "md" | "lg" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold no-underline transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const VARIANTE: Record<VarianteBoton, string> = {
  primario: "bg-marca text-white hover:bg-marca-oscura",
  secundario: "bg-superficie text-marca border border-borde-fuerte hover:bg-marca-suave",
  peligro: "bg-roja text-white hover:bg-roja-tinta",
  fantasma: "bg-transparent text-marca underline hover:bg-marca-suave",
};

const TAMANO: Record<TamanoBoton, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-base", // 44 px: toque cómodo en el celular
  lg: "min-h-13 px-6 text-lg",
};

/** Clases del botón, para usarlas en un elemento propio (p. ej. `<button formAction>` o `<summary>`). */
export function clasesBoton(variante: VarianteBoton = "primario", tamano: TamanoBoton = "md", extra?: string) {
  return cx(BASE, VARIANTE[variante], TAMANO[tamano], extra);
}

type Comunes = { variante?: VarianteBoton; tamano?: TamanoBoton; icono?: ReactNode; children: ReactNode };

/**
 * Botón de PACHA. Con `href` se dibuja como enlace (next/link); sin `href`, como `<button>`.
 * `type` por defecto es "button": para enviar un formulario, pásale `type="submit"`.
 */
export function Boton(props: Comunes & ({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "children">)): ReactNode;
export function Boton(props: Comunes & ({ href?: undefined } & Omit<ComponentProps<"button">, "children">)): ReactNode;
export function Boton({
  variante = "primario",
  tamano = "md",
  icono,
  children,
  className,
  ...resto
}: Comunes & { className?: string; href?: string } & Record<string, unknown>) {
  const clases = clasesBoton(variante, tamano, className);
  const contenido = (
    <>
      {icono && <span aria-hidden="true" className="inline-flex shrink-0">{icono}</span>}
      {children}
    </>
  );
  if (typeof resto.href === "string") {
    const { href, ...enlace } = resto as { href: string } & Omit<ComponentProps<typeof Link>, "href">;
    return (
      <Link href={href} className={clases} {...enlace}>
        {contenido}
      </Link>
    );
  }
  const boton = resto as ComponentProps<"button">;
  return (
    <button type="button" className={clases} {...boton}>
      {contenido}
    </button>
  );
}
