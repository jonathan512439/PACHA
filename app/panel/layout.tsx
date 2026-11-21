import Link from "next/link";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4 border-b border-stone-200 pb-3">
        <span className="font-bold text-emerald-900">Panel técnico</span>
        <nav aria-label="Panel" className="flex gap-4 text-sm">
          <Link href="/panel" className="hover:underline">Resumen y prioridad</Link>
          <Link href="/panel/alertas" className="hover:underline">Alertas</Link>
          <Link href="/panel/reportes" className="hover:underline">Reportes y entregas</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
