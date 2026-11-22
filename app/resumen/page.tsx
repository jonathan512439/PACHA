import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { comunidadesVisibles, reportesYEntregas } from "@/lib/visibilidad";
import { resumenSemanal, textoContador, textoEntrega, textoHoras, textoRespuesta, tiemposRespuesta } from "@/lib/visibilidad-calculo";
import { BotonImprimir } from "@/components/ui/BotonImprimir";
import { Cifra } from "@/components/ui/Cifra";
import { fechaHora } from "@/components/ui/formato";

export const metadata: Metadata = {
  title: "Resumen semanal",
  description: "Comunidades sin agua o forraje, días acumulados, familias, entregas y pendientes. Para llevar impreso a la Gobernación o al municipio.",
};

export default function PaginaResumen() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8 print:max-w-none print:p-0">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando el resumen" />}>
        <Resumen />
      </Suspense>
    </main>
  );
}

async function Resumen() {
  await connection();
  const ahora = new Date();
  const [comunidades, { reportes, entregas }] = await Promise.all([comunidadesVisibles(ahora), reportesYEntregas()]);
  const r = resumenSemanal(comunidades, entregas, ahora);
  const t = tiemposRespuesta(reportes, entregas);
  const afectadas = comunidades
    .filter((c) => c.vis.sinAgua || c.vis.sinForraje)
    .sort((a, b) => Math.max(b.vis.sinAgua?.dias ?? 0, b.vis.sinForraje?.dias ?? 0) - Math.max(a.vis.sinAgua?.dias ?? 0, a.vis.sinForraje?.dias ?? 0));
  const hayEjemplo = comunidades.some((c) => c.is_example);

  return (
    <>
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-wider text-acento">PACHA · Altiplano de Oruro</p>
        <h1 className="text-4xl font-semibold">Resumen para autoridades y prensa</h1>
        <p className="text-tinta-2">
          Datos al {fechaHora(ahora)} (hora de Bolivia). Entregas de los últimos 7 días. Solo datos que las comunidades confirmaron; sin nombres ni
          teléfonos.
        </p>
        {hayEjemplo && (
          <p className="inline-block rounded-md border border-ocre bg-ocre-suave px-2 py-1 text-sm font-semibold text-ocre-tinta">
            Comunidades, reportes y entregas de EJEMPLO.
          </p>
        )}
        <div className="pt-1">
          <BotonImprimir texto="Imprimir o guardar en PDF" />
        </div>
      </header>

      <section aria-label="Cifras principales" className="grid grid-cols-2 gap-4 rounded-xl border border-borde bg-superficie p-5 shadow-suave sm:grid-cols-3 print:shadow-none">
        <Cifra valor={r.comunidadesSinAgua} etiqueta="comunidades sin agua" tono={r.comunidadesSinAgua ? "roja" : "tinta"} />
        <Cifra valor={r.comunidadesSinForraje} etiqueta="comunidades sin forraje" tono={r.comunidadesSinForraje ? "roja" : "tinta"} />
        <Cifra valor={r.diasAcumulados} etiqueta="días acumulados sin agua o forraje" />
        <Cifra valor={r.familiasAfectadas} etiqueta="familias afectadas" />
        <Cifra valor={r.pendientesSinEntrega} etiqueta="comunidades con un reporte sin entrega todavía" tono={r.pendientesSinEntrega ? "roja" : "tinta"} />
        <Cifra
          valor={r.entregas.llego}
          unidad={`de ${r.entregas.total}`}
          etiqueta="entregas que la comunidad confirmó"
          detalle={`${r.entregas.noLlego} no llegaron · ${r.entregas.sinRespuesta} sin respuesta`}
          tono="verde"
        />
      </section>

      <section aria-labelledby="tiempos" className="space-y-1">
        <h2 id="tiempos" className="text-xl font-semibold">Tiempo de respuesta (promedio)</h2>
        <p className="text-tinta">
          Del reporte a la entrega: <b className="cifras">{t.reporteAEntrega !== null ? textoHoras(t.reporteAEntrega) : "sin datos"}</b>
          {" · "}De la entrega a la respuesta de la comunidad: <b className="cifras">{t.entregaARespuesta !== null ? textoHoras(t.entregaARespuesta) : "sin datos"}</b>
          <span className="text-tinta-2"> ({t.entregasMedidas} {t.entregasMedidas === 1 ? "entrega medida" : "entregas medidas"})</span>
        </p>
      </section>

      <section aria-labelledby="detalle" className="space-y-2">
        <h2 id="detalle" className="text-xl font-semibold">Comunidades afectadas</h2>
        {afectadas.length === 0 ? (
          <p className="text-tinta">Ninguna comunidad tiene falta de agua o forraje sin resolver.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead className="bg-superficie-2 text-tinta">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Comunidad</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Situación</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Familias</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Última entrega</th>
                </tr>
              </thead>
              <tbody className="cifras divide-y divide-borde">
                {afectadas.map((c) => {
                  const e = c.vis.ultimaEntrega;
                  return (
                    <tr key={c.id} className="align-top">
                      <td className="px-3 py-2 font-medium">
                        {c.name}
                        {c.is_example && <span className="ml-1 text-xs font-semibold text-ocre-tinta">(EJEMPLO)</span>}
                      </td>
                      <td className="px-3 py-2">
                        {[c.vis.sinAgua, c.vis.sinForraje].filter((k) => k !== null).map((k) => textoContador(k)).join(" · ")}
                        {c.vis.sinEntrega && <span className="block font-semibold text-roja-tinta">Sin entrega todavía</span>}
                      </td>
                      <td className="px-3 py-2 text-right">{c.vis.sinAgua?.familias ?? c.vis.sinForraje?.familias ?? c.families}</td>
                      <td className="px-3 py-2">{e ? `${textoEntrega(e)} · ${fechaHora(e.delivered_at)} · ${textoRespuesta(e.confirmed_by_community)}` : "—"}</td>
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
          Fuentes: reportes por voz confirmados por cada comunidad en el bot de PACHA; entregas registradas por la técnica del municipio con foto, y la
          respuesta de la comunidad (llegó / no llegó). Avisos del Senamhi.
        </p>
        <p>Los días se cuentan desde el reporte y suben hasta que la comunidad confirma que llegó la ayuda. Ficha de cada comunidad en el mapa de PACHA.</p>
      </footer>
    </>
  );
}
