import Link from "next/link";
import { Suspense } from "react";
import { salir } from "@/app/ingresar/acciones";
import { accesoActual } from "@/lib/acceso-panel";
import { NOMBRE_ROL, modoSesion } from "@/lib/sesion";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4 border-b border-stone-200 pb-3">
        <span className="font-bold text-emerald-900">Panel técnico</span>
        <nav aria-label="Panel" className="flex gap-4 text-sm">
          <Link href="/panel" className="hover:underline">Resumen y prioridad</Link>
          <Link href="/panel/alertas" className="hover:underline">Alertas</Link>
          <Link href="/panel/reportes" className="hover:underline">Reportes y entregas</Link>
          <Link href="/panel/tarjetas" className="hover:underline">Tarjetas</Link>
          <Link href="/panel/fuentes" className="hover:underline">Fuentes</Link>
        </nav>
        {/* La sesión se lee en la petición: va detrás de Suspense para no bloquear el resto (Cache Components). */}
        <Suspense fallback={null}>
          <UsuarioActual />
        </Suspense>
      </div>
      {children}
    </div>
  );
}

async function UsuarioActual() {
  const a = await accesoActual();
  if (!a) return null;
  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <span>
        <span className="font-semibold">{a.usuario}</span>{" "}
        <span className="text-stone-700">({NOMBRE_ROL[a.rol]})</span>
      </span>
      {modoSesion() && (
        <form action={salir}>
          <button type="submit" className="rounded-md border border-stone-400 px-3 py-1 font-semibold hover:bg-stone-100">
            Salir
          </button>
        </form>
      )}
    </div>
  );
}
