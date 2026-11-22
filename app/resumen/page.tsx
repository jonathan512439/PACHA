import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { comunidadesVisibles, reportesYEntregas } from "@/lib/visibilidad";
import { resumenSemanal, textoContador, textoEntrega, textoHoras, textoRespuesta, tiemposRespuesta } from "@/lib/visibilidad-calculo";
import { BotonImprimir } from "@/components/ui/BotonImprimir";
import { fechaHora } from "@/components/ui/formato";

export const metadata: Metadata = {
  title: "Resumen de situación",
  description: "Comunidades sin agua o forraje, familias afectadas, entregas y tiempos de respuesta en el Altiplano de Oruro.",
};

export default function PaginaResumen() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8 print:max-w-none print:p-0">
      <Suspense fallback={<div className="h-96 rounded-xl border border-borde bg-superficie-2" role="status" aria-label="Cargando el resumen" />}>
        <Resumen />
      </Suspense>
    </main>
  );
}

const Fila = ({ etiqueta, valor }: { etiqueta: string; valor: string | number }) => (
  <tr>
    <th scope="row" className="py-2 pr-4 text-left font-normal text-tinta">{etiqueta}</th>
    <td className="cifras py-2 text-right font-semibold text-tinta">{valor}</td>
  </tr>
);

async function Resumen() {
  await connection();
  const ahora = new Date();
  const [comunidades, { reportes, entregas }] = await Promise.all([comunidadesVisibles(ahora), reportesYEntregas()]);
  const r = resumenSemanal(comunidades, entregas, ahora);
  const t = tiemposRespuesta(reportes, entregas);
  const afectadas = comunidades
    .filter((c) => c.vis.sinAgua || c.vis.sinForraje)
    .sort((a, b) => Math.max(b.vis.sinAgua?.dias ?? 0, b.vis.sinForraje?.dias ?? 0) - Math.max(a.vis.sinAgua?.dias ?? 0, a.vis.sinForraje?.dias ?? 0));
  const hayDemostracion = comunidades.some((c) => c.is_example);

  return (
    <article className="space-y-8 text-tinta">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-borde-fuerte pb-4">
        <div className="space-y-1">
          <p className="text-sm text-tinta-2">PACHA · Altiplano de Oruro</p>
          <h1 className="text-3xl font-semibold">Resumen de situación: agua y forraje</h1>
          <p className="text-sm text-tinta-2">Fecha de corte: {fechaHora(ahora)} (hora de Bolivia)</p>
        </div>
        <BotonImprimir texto="Imprimir o guardar en PDF" />
      </header>

      <section aria-labelledby="indicadores" className="space-y-2">
        <h2 id="indicadores" className="text-lg font-semibold">1. Indicadores</h2>
        <table className="w-full max-w-xl border-collapse text-sm">
          <tbody className="divide-y divide-borde border-y border-borde">
            <Fila etiqueta="Comunidades sin agua" valor={r.comunidadesSinAgua} />
            <Fila etiqueta="Comunidades sin forraje" valor={r.comunidadesSinForraje} />
            <Fila etiqueta="Días acumulados sin agua o forraje" valor={r.diasAcumulados} />
            <Fila etiqueta="Familias afectadas" valor={r.familiasAfectadas} />
            <Fila etiqueta="Comunidades con reporte y sin entrega" valor={r.pendientesSinEntrega} />
            <Fila etiqueta="Entregas de los últimos 7 días" valor={r.entregas.total} />
            <Fila etiqueta="Recibidas, según la comunidad" valor={r.entregas.llego} />
            <Fila etiqueta="No recibidas, según la comunidad" valor={r.entregas.noLlego} />
            <Fila etiqueta="Sin confirmar" valor={r.entregas.sinRespuesta} />
          </tbody>
        </table>
      </section>

      <section aria-labelledby="tiempos" className="space-y-2">
        <h2 id="tiempos" className="text-lg font-semibold">2. Tiempo de respuesta (promedio)</h2>
        <table className="w-full max-w-xl border-collapse text-sm">
          <tbody className="divide-y divide-borde border-y border-borde">
            <Fila etiqueta="Del reporte a la entrega" valor={t.reporteAEntrega !== null ? textoHoras(t.reporteAEntrega) : "Sin datos"} />
            <Fila etiqueta="De la entrega a la confirmación" valor={t.entregaARespuesta !== null ? textoHoras(t.entregaARespuesta) : "Sin datos"} />
            <Fila etiqueta="Entregas consideradas" valor={t.entregasMedidas} />
          </tbody>
        </table>
      </section>

      <section aria-labelledby="detalle" className="space-y-2">
        <h2 id="detalle" className="text-lg font-semibold">3. Comunidades afectadas</h2>
        {afectadas.length === 0 ? (
          <p className="text-sm">Ninguna comunidad tiene falta de agua o forraje pendiente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead className="border-b border-borde-fuerte">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-semibold">Comunidad</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Situación</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Familias</th>
                  <th scope="col" className="py-2 font-semibold">Última entrega</th>
                </tr>
              </thead>
              <tbody className="cifras divide-y divide-borde border-b border-borde">
                {afectadas.map((c) => {
                  const e = c.vis.ultimaEntrega;
                  return (
                    <tr key={c.id} className="align-top">
                      <td className="py-2 pr-3 font-medium">{c.name}</td>
                      <td className="py-2 pr-3">
                        {[c.vis.sinAgua, c.vis.sinForraje].filter((k) => k !== null).map((k) => textoContador(k)).join(" · ")}
                        {c.vis.sinEntrega && <span className="block text-tinta-2">Sin entrega</span>}
                      </td>
                      <td className="py-2 pr-3 text-right">{c.vis.sinAgua?.familias ?? c.vis.sinForraje?.familias ?? c.families}</td>
                      <td className="py-2">{e ? `${textoEntrega(e)}, ${fechaHora(e.delivered_at)}. ${textoRespuesta(e.confirmed_by_community)}` : "Ninguna"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="space-y-1 border-t border-borde pt-3 text-xs text-tinta-2">
        <p>
          Fuentes: reportes confirmados por las comunidades a través de PACHA; entregas registradas por el municipio y confirmadas por la comunidad.
          Avisos del Senamhi.
        </p>
        <p>Los días se cuentan desde el reporte hasta que la comunidad confirma una entrega. No incluye datos personales.</p>
        {hayDemostracion && <p>Comunidades, reportes y entregas de demostración.</p>}
      </footer>
    </article>
  );
}
