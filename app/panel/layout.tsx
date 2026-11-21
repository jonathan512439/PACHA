import Link from "next/link";
import type { ReactNode } from "react";
import s from "./panel.module.css";

const enlaces = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/reportes", label: "Reportes" },
  { href: "/panel/alertas", label: "Alertas" },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <Link className={s.panelBrand} href="/panel">
          <span>P</span>
          <span>PACHA <small>GESTIÓN</small></span>
        </Link>
        <nav aria-label="Navegación del panel" className={s.panelNav}>
          {enlaces.map((enlace) => (
            <Link href={enlace.href} key={enlace.href}>{enlace.label}</Link>
          ))}
        </nav>
        <Link className={s.publicLink} href="/">← Volver al mapa público</Link>
      </aside>
      <div className={s.panelContent}>{children}</div>
    </div>
  );
}
