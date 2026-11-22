import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/** Estado vacío: "Todavía no hay entregas registradas." con un ícono y, si hace falta, una acción. */
export function Vacio({
  titulo,
  children,
  accion,
  icono: Icono = Inbox,
  className,
}: {
  titulo: ReactNode;
  children?: ReactNode;
  accion?: ReactNode;
  icono?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center gap-2 rounded-xl border border-dashed border-borde-fuerte bg-superficie px-6 py-10 text-center", className)}>
      <Icono aria-hidden="true" className="size-8 text-tinta-2" strokeWidth={1.75} />
      <p className="font-semibold text-tinta">{titulo}</p>
      {children && <div className="max-w-prose text-sm text-tinta-2">{children}</div>}
      {accion && <div className="pt-2">{accion}</div>}
    </div>
  );
}
