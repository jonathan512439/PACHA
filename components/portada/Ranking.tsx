import { COLOR_URGENCIA, NOMBRE_URGENCIA, urgenciaDe } from "@/components/mapa/colores";
import { Insignia } from "@/components/ui/Insignia";
import { numero } from "@/components/ui/formato";
import type { ComunidadMapa } from "@/lib/datos-publicos";

/** Ranking público de prioridad, con el desglose de cada puntaje. Es también la alternativa accesible al mapa. */
export function Ranking({ comunidades }: { comunidades: ComunidadMapa[] }) {
  return (
    <ol className="divide-y divide-borde" aria-label="Comunidades ordenadas por prioridad">
      {comunidades.map((c, i) => {
        const u = urgenciaDe(c.prioridad);
        const activa = c.prioridad.estado === "activa" ? c.prioridad.resultado : null;
        return (
          <li key={c.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-superficie-2 [&::-webkit-details-marker]:hidden">
                <span className="cifras w-5 shrink-0 text-right text-sm text-tinta-2">{i + 1}</span>
                <span className="size-3 shrink-0 rounded-full ring-1 ring-tinta/40" style={{ background: COLOR_URGENCIA[u] }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">{c.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Insignia tipo={`nivel-${u}`} />
                    {c.is_example && <Insignia tipo="ejemplo" />}
                  </span>
                </span>
                <span className="cifras shrink-0 text-right">
                  {activa ? (
                    <>
                      <span className="block font-titulo text-xl font-semibold leading-none">{numero(activa.score, 1)}</span>
                      <span className="text-xs text-tinta-2">de 100</span>
                    </>
                  ) : (
                    <span className="text-sm text-tinta-2">—</span>
                  )}
                </span>
              </summary>
              <div className="px-4 pb-4 pl-12 text-sm text-tinta-2">
                {activa ? (
                  <ul className="space-y-0.5">
                    {activa.desglose.map((d) => (
                      <li key={d.criterio} className="flex gap-2">
                        <span className="flex-1">
                          {d.criterio}
                          {d.nota && <span className="italic"> ({d.nota})</span>}
                        </span>
                        <b className="cifras text-tinta">{numero(d.aporte, 1)}</b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{c.families} familias · sin reportes confirmados pendientes.</p>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

const UMBRAL = { rojo: " (70 o más)", naranja: " (50 a 69)", amarillo: " (30 a 49)", verde: " (menos de 30)", gris: "" } as const;

export function Leyenda() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-tinta" aria-label="Leyenda de colores del mapa">
      {(["rojo", "naranja", "amarillo", "verde", "gris"] as const).map((u) => (
        <li key={u} className="flex items-center gap-1.5">
          <span className="size-3 rounded-full ring-1 ring-tinta/40" style={{ background: COLOR_URGENCIA[u] }} aria-hidden="true" />
          {NOMBRE_URGENCIA[u]}
          <span className="text-tinta-2">{UMBRAL[u]}</span>
        </li>
      ))}
    </ul>
  );
}
