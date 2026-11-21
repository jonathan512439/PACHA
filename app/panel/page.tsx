import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { comunidadesConPrioridad, resumenPanel } from "@/lib/datos-publicos";
import { BotonAccion } from "@/components/panel/Acciones";
import { COLOR_URGENCIA, NOMBRE_URGENCIA, urgenciaDe } from "@/components/mapa/colores";
import RefrescoAuto from "@/components/RefrescoAuto";
import { reiniciar } from "./acciones";

export const metadata: Metadata = { title: "Panel" };

export default function Panel() {
  return (
    <Suspense fallback={<p className="text-stone-500">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const [r, comunidades] = await Promise.all([resumenPanel(), comunidadesConPrioridad()]);
  const tarjetas = [
    { n: r.borradores, t: "alertas en borrador", href: "/panel/alertas" },
    { n: r.revisar, t: "reportes por revisar", href: "/panel/reportes" },
    { n: r.confirmados, t: "reportes confirmados", href: "/panel/reportes" },
    { n: r.atendidos, t: "reportes atendidos", href: "/panel/reportes" },
    { n: r.suscriptores, t: "personas suscritas", href: "/panel" },
  ];
  return (
    <div className="space-y-6">
      <RefrescoAuto segundos={20} />
      <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {tarjetas.map((x) => (
          <li key={x.t}><a href={x.href} className="block rounded-lg bg-white border border-stone-200 p-3 hover:border-emerald-700">
            <span className="block text-2xl font-bold">{x.n}</span><span className="text-xs text-stone-600">{x.t}</span>
          </a></li>
        ))}
      </ul>

      <section className="rounded-lg bg-white border border-stone-200">
        <h2 className="px-4 pt-3 font-semibold">Prioridad por comunidad</h2>
        <p className="px-4 text-xs text-stone-500">Máximo de los reportes confirmados no atendidos; la espera se recalcula ahora.</p>
        <table className="w-full text-sm mt-2">
          <thead className="text-left text-stone-500"><tr><th className="px-4 py-1">Comunidad</th><th>Puntaje</th><th>Días</th><th>Familias</th><th>Animales</th><th>Espera</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {comunidades.map((c) => {
              const u = urgenciaDe(c.prioridad);
              const d = c.prioridad.estado === "activa" ? c.prioridad.resultado.desglose : null;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ background: COLOR_URGENCIA[u] }} />{c.name}{c.is_test && " (prueba)"}</td>
                  <td className="font-semibold">{c.prioridad.estado === "activa" ? c.prioridad.resultado.score : "—"} <span className="font-normal text-stone-500">{NOMBRE_URGENCIA[u]}</span></td>
                  {d ? d.map((x) => <td key={x.criterio}>{x.aporte}{x.nota ? "*" : ""}</td>) : <td colSpan={4} className="text-stone-400">sin reportes</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-stone-500">* dato faltante: se usó el valor neutro (no baja la prioridad).</p>
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
        <h2 className="font-semibold text-red-900">Reiniciar demo</h2>
        <p className="text-sm text-red-900">Borra reportes, alertas, boletines y entregas, y vuelve a cargar los datos de EJEMPLO. No borra suscriptores ni tarjetas.</p>
        <BotonAccion accion={reiniciar} variante="peligro" confirmar="¿Reiniciar el demo? Se borran reportes, alertas, boletines y entregas.">Reiniciar demo</BotonAccion>
      </section>
    </div>
  );
}
