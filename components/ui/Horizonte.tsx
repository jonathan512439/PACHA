import { cx } from "./cx";

/**
 * Motivo gráfico de PACHA: una línea fina escalonada (horizonte del Altiplano y andenes).
 * Decorativa (aria-hidden). Úsala como separador o al pie de la cabecera. Toma el color del texto (`text-*`).
 */
export function Horizonte({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 240 12"
      preserveAspectRatio="none"
      className={cx("block h-3 w-full", className)}
    >
      <path
        d="M0 11 H34 V8 H58 V5 H80 V8 H104 V2 H124 V5 H142 V8 H170 V4 H190 V7 H212 V9 H240"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
