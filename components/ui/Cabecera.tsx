import Link from "next/link";
import { Suspense } from "react";
import { accesoActual } from "@/lib/acceso-panel";

const NAV = [
  { href: "/", texto: "Mapa" },
  { href: "/tarjetas", texto: "Qué hacer" },
  { href: "/entregas", texto: "Entregas" },
  { href: "/como-funciona", texto: "Cómo funciona" },
  { href: "/suscribirse", texto: "Suscribirse" },
  { href: "/probar", texto: "Probar el bot" },
];

const CLASES_ACCESO =
  "ml-auto inline-flex min-h-10 items-center rounded-md border border-white/60 px-3 text-sm text-white no-underline hover:bg-marca-oscura";

/** Con sesión del panel: "Panel técnico"; sin sesión: "Ingresar". */
export async function AccesoPanel() {
  const acceso = await accesoActual();
  return (
    <Link href="/panel" className={CLASES_ACCESO}>
      {acceso ? "Panel técnico" : "Ingresar"}
    </Link>
  );
}

/** Cabecera pública: marca, navegación y acceso al panel. */
export function Cabecera() {
  return (
    <header className="border-b border-marca-oscura bg-marca text-white print:hidden [&_a:focus-visible]:outline-white">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-superficie focus:px-3 focus:py-2 focus:text-marca">
        Saltar al contenido
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-white no-underline">
          <span className="font-titulo text-2xl font-semibold tracking-wide">PACHA</span>
        </Link>
        <nav aria-label="Principal" className="order-last w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap gap-x-1 gap-y-1 text-[15px]">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-10 items-center rounded-md px-2.5 text-white no-underline hover:bg-marca-oscura hover:underline">
                  {n.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* La sesión se lee en la petición: va detrás de Suspense para no bloquear la página (Cache Components). */}
        <Suspense fallback={<span aria-hidden="true" className={`${CLASES_ACCESO} invisible`}>Panel técnico</span>}>
          <AccesoPanel />
        </Suspense>
      </div>
    </header>
  );
}
