import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

/** Clases del control (input, select, textarea): borde ≥ 3:1, 44 px de alto, foco visible. */
export const CLASES_CONTROL =
  "block w-full min-h-11 rounded-lg border border-borde-fuerte bg-superficie px-3 py-2 text-base text-tinta " +
  "placeholder:text-tinta-2 focus-visible:border-marca disabled:bg-superficie-2 disabled:text-tinta-2 " +
  "aria-[invalid=true]:border-roja";

type Base = {
  /** Texto visible de la etiqueta (siempre visible: nada de solo placeholder). */
  etiqueta: ReactNode;
  name: string;
  /** Ayuda corta debajo de la etiqueta. */
  ayuda?: ReactNode;
  /** Mensaje de error: marca el campo como inválido y se anuncia. */
  error?: ReactNode;
  className?: string;
};

/**
 * Campo de formulario con etiqueta, ayuda y error enlazados por id.
 * - `como="input"` (por defecto): acepta todo lo de `<input>` (type, required, autoComplete…).
 * - `como="textarea"` o `como="select"` (con sus `<option>` como children).
 */
export function Campo(props: Base & { como?: "input" } & Omit<ComponentProps<"input">, "name" | "className">): ReactNode;
export function Campo(props: Base & { como: "textarea" } & Omit<ComponentProps<"textarea">, "name" | "className">): ReactNode;
export function Campo(props: Base & { como: "select"; children: ReactNode } & Omit<ComponentProps<"select">, "name" | "className">): ReactNode;
export function Campo({
  etiqueta,
  name,
  ayuda,
  error,
  className,
  como = "input",
  id,
  children,
  ...control
}: Base & { como?: "input" | "textarea" | "select"; id?: string; children?: ReactNode } & Record<string, unknown>) {
  const idControl = id ?? `campo-${name}`;
  const idAyuda = ayuda ? `${idControl}-ayuda` : undefined;
  const idError = error ? `${idControl}-error` : undefined;
  const comunes = {
    id: idControl,
    name,
    className: cx(CLASES_CONTROL, como === "textarea" && "min-h-24"),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [idAyuda, idError].filter(Boolean).join(" ") || undefined,
  };
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={idControl} className="block text-sm font-semibold text-tinta">
        {etiqueta}
        {control.required ? <span className="text-roja" aria-hidden="true"> *</span> : null}
      </label>
      {ayuda && <p id={idAyuda} className="text-sm text-tinta-2">{ayuda}</p>}
      {como === "textarea" ? (
        <textarea {...(control as ComponentProps<"textarea">)} {...comunes} />
      ) : como === "select" ? (
        <select {...(control as ComponentProps<"select">)} {...comunes}>{children}</select>
      ) : (
        <input {...(control as ComponentProps<"input">)} {...comunes} />
      )}
      {error && (
        <p id={idError} role="alert" className="text-sm font-semibold text-roja-tinta">
          {error}
        </p>
      )}
    </div>
  );
}
