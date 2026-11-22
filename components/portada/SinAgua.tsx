import Link from "next/link";
import { textoContador, textoEntrega, textoRespuesta } from "@/lib/visibilidad-calculo";
import type { ComunidadVisible } from "@/lib/visibilidad";
import { fechaHora } from "@/components/ui/formato";

/** Resumen de la portada: cifras generales y la tabla de comunidades sin agua o forraje, de más a menos días. */
export function ResumenComunidades({ comunidades }: { comunidades: ComunidadVisible[] }) {
  const afectadas = comunidades
    .filter((c) => c.vis.sinAgua || c.vis.sinForraje)
    .sort((a, b) => Math.max(b.vis.sinAgua?.dias ?? 0, b.vis.sinForraje?.dias ?? 0) - Math.max(a.vis.sinAgua?.dias ?? 0, a.vis.sinForraje?.dias ?? 0));
  const conReporte = comunidades.filter((c) => c.prioridad.estado === "activa").length;
  const familias = afectadas.reduce((s, c) => s + (c.vis.sinAgua?.familias ?? c.vis.sinForraje?.familias ?? c.families), 0);
  const sinEntrega = afectadas.filter((c) => c.vis.sinEntrega).length;

  const cifras = [
    { valor: conReporte, texto: "con reportes pendientes" },
    { valor: afectadas.length, texto: "sin agua o forraje" },
    { valor: familias, texto: "familias afectadas" },
    { valor: sinEntrega, texto: "sin entrega" },
  ];

  return (
    <section aria-labelledby="resumen-titulo" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="resumen-titulo" className="text-2xl font-semibold">Resumen</h2>
        <Link href="/resumen" className="text-sm text-marca underline">Versión para imprimir</Link>
      </div>

      <dl className="grid grid-cols-2 divide-borde overflow-hidden rounded-xl border border-borde bg-superficie sm:grid-cols-4 sm:divide-x">
        {cifras.map((c) => (
          <div key={c.texto} className="flex flex-col-reverse px-4 py-3">
            <dt className="text-sm text-tinta-2">{c.texto}</dt>
            <dd className="cifras text-2xl font-semibold text-tinta">{c.valor}</dd>
          </div>
        ))}
      </dl>

      {afectadas.length === 0 ? (
        <p className="text-tinta-2">Ninguna comunidad tiene falta de agua o forraje pendiente.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="border-b border-borde bg-superficie-2 text-tinta">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Comunidad</th>
                <th scope="col" className="px-4 py-2 font-semibold">Situación</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Familias</th>
                <th scope="col" className="px-4 py-2 font-semibold">Última entrega</th>
              </tr>
            </thead>
            <tbody className="cifras divide-y divide-borde">
              {afectadas.map((c) => {
                const e = c.vis.ultimaEntrega;
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-2">
                      <Link href={`/comunidad/${c.id}`} className="font-medium text-marca underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-2">
                      {[c.vis.sinAgua, c.vis.sinForraje].filter((k) => k !== null).map((k) => textoContador(k)).join(" · ")}
                    </td>
                    <td className="px-4 py-2 text-right">{c.vis.sinAgua?.familias ?? c.vis.sinForraje?.familias ?? c.families}</td>
                    <td className="px-4 py-2 text-tinta-2">
                      {e ? `${textoEntrega(e)}, ${fechaHora(e.delivered_at)} · ${textoRespuesta(e.confirmed_by_community)}` : "Ninguna"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
