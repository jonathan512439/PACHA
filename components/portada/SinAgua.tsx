import Link from "next/link";
import { Droplets, Wheat } from "lucide-react";
import { Insignia } from "@/components/ui/Insignia";
import { textoContador } from "@/lib/visibilidad-calculo";
import type { ComunidadVisible } from "@/lib/visibilidad";

/** «Sin agua, a la vista»: comunidades con días sin agua o forraje, de más a menos días. Cada una enlaza a su ficha. */
export function SinAgua({ comunidades }: { comunidades: ComunidadVisible[] }) {
  const filas = comunidades
    .flatMap((c) => [c.vis.sinAgua, c.vis.sinForraje].filter((k) => k !== null).map((k) => ({ c, k })))
    .sort((a, b) => b.k.dias - a.k.dias);

  return (
    <section aria-labelledby="sin-agua-titulo" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="sin-agua-titulo" className="text-2xl font-semibold sm:text-3xl">Sin agua, a la vista</h2>
          <p className="max-w-prose text-tinta-2">
            Días que cada comunidad lleva sin agua o forraje, según lo que ella misma reportó y confirmó. El número sube cada día hasta que
            confirma que llegó la ayuda.
          </p>
        </div>
        <Link href="/resumen" className="text-sm font-semibold text-marca underline">Resumen para autoridades y prensa</Link>
      </div>
      {filas.length === 0 ? (
        <p className="rounded-xl border border-borde bg-superficie p-4 text-tinta">Ninguna comunidad tiene falta de agua o forraje sin resolver.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filas.map(({ c, k }) => {
            const Icono = k.recurso === "agua" ? Droplets : Wheat;
            return (
              <li key={`${c.id}-${k.recurso}`}>
                <Link
                  href={`/comunidad/${c.id}`}
                  className="flex h-full gap-3 rounded-xl border border-borde border-l-[6px] border-l-roja bg-superficie p-4 text-tinta no-underline shadow-suave hover:border-marca"
                >
                  <span className="cifras font-titulo text-4xl font-semibold leading-none text-roja">{k.dias}</span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block font-semibold leading-snug">{c.name}</span>
                    <span className="flex items-center gap-1.5 text-sm">
                      <Icono aria-hidden="true" className="size-4 shrink-0 text-tinta-2" />
                      {textoContador(k)}
                      {k.familias != null && ` · ${k.familias} familias`}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {c.vis.sinEntrega ? (
                        <Insignia tipo="no-llego">Sin entrega todavía</Insignia>
                      ) : c.vis.ultimaEntrega?.confirmed_by_community === false ? (
                        <Insignia tipo="no-llego">La entrega no llegó</Insignia>
                      ) : (
                        <Insignia tipo="sin-respuesta">Entrega sin confirmar</Insignia>
                      )}
                      {c.is_example && <Insignia tipo="ejemplo" />}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
