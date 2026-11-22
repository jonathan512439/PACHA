import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Cita de una fuente: "Fuente: Senamhi, Boletín agrometeorológico decenal, p. 6 · consultado el 22/11/2026 ↗".
 * Todo dato al público lleva fuente y fecha. Si hay `url`, el documento se abre en otra pestaña.
 */
export function Fuente({
  institucion,
  documento,
  pagina,
  url,
  fecha,
  prefijo = "Fuente",
  className,
}: {
  institucion: ReactNode;
  documento?: ReactNode;
  pagina?: string | number | null;
  url?: string | null;
  /** Texto de la fecha ya formateado ("consultado el 22/11/2026", "14 al 23 de noviembre"). */
  fecha?: ReactNode;
  prefijo?: string;
  className?: string;
}) {
  const texto = (
    <>
      {institucion}
      {documento ? <>, {documento}</> : null}
      {pagina != null && pagina !== "" ? `, p. ${pagina}` : ""}
    </>
  );
  return (
    <p className={cx("text-sm text-tinta-2", className)}>
      <span className="font-semibold text-tinta">{prefijo}:</span>{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-marca underline hover:no-underline">
          {texto}
          <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5 align-[-2px]" />
          <span className="sr-only"> (abre el documento original en otra pestaña)</span>
        </a>
      ) : (
        texto
      )}
      {fecha ? <> · {fecha}</> : null}
    </p>
  );
}
