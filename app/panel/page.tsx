import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { comunidadesConPrioridad, resumenPanel } from "@/lib/datos-publicos";
import { BotonAccion } from "@/components/panel/Acciones";
import { COLOR_URGENCIA, NOMBRE_URGENCIA, urgenciaDe } from "@/components/mapa/colores";
import RefrescoAuto from "@/components/RefrescoAuto";
import { enviarProblema, reiniciar } from "./acciones";
import { problemasActivos, HORAS_SIN_REPETIR } from "@/lib/problemas";

export const metadata: Metadata = { title: "Panel" };

export default function Panel() {
  return (
    <Suspense fallback={<p className="text-tinta-2">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const [r, comunidades, { problemas, migracionPendiente }] = await Promise.all([resumenPanel(), comunidadesConPrioridad(), problemasActivos()]);
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
          <li key={x.t}><a href={x.href} className="block rounded-lg bg-superficie border border-borde p-3 hover:border-marca">
            <span className="cifras block font-titulo text-3xl font-semibold">{x.n}</span><span className="text-xs text-tinta-2">{x.t}</span>
          </a></li>
        ))}
      </ul>

      <ProblemasActivos problemas={problemas} migracionPendiente={migracionPendiente} />

      <section className="rounded-lg bg-superficie border border-borde">
        <h2 className="px-4 pt-3 font-semibold">Prioridad por comunidad</h2>
        <p className="px-4 text-xs text-tinta-2">Máximo de los reportes confirmados no atendidos; la espera se recalcula ahora.</p>
        <table className="w-full text-sm mt-2">
          <thead className="text-left text-tinta-2"><tr><th className="px-4 py-1">Comunidad</th><th>Puntaje</th><th>Días</th><th>Familias</th><th>Animales</th><th>Espera</th></tr></thead>
          <tbody className="divide-y divide-borde">
            {comunidades.map((c) => {
              const u = urgenciaDe(c.prioridad);
              const d = c.prioridad.estado === "activa" ? c.prioridad.resultado.desglose : null;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ background: COLOR_URGENCIA[u] }} />{c.name}{c.is_test && " (prueba)"}</td>
                  <td className="font-semibold">{c.prioridad.estado === "activa" ? c.prioridad.resultado.score : "—"} <span className="font-normal text-tinta-2">{NOMBRE_URGENCIA[u]}</span></td>
                  {d ? d.map((x) => <td key={x.criterio}>{x.aporte}{x.nota ? "*" : ""}</td>) : <td colSpan={4} className="text-tinta-2">sin reportes</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-4 py-2 text-xs text-tinta-2">* dato faltante: se usó el valor neutro (no baja la prioridad).</p>
      </section>

      <section className="rounded-lg border border-roja bg-roja-suave p-4 space-y-2">
        <h2 className="font-semibold text-roja-tinta">Reiniciar demo</h2>
        <p className="text-sm text-roja-tinta">Borra reportes, alertas, boletines y entregas, y vuelve a cargar los datos de EJEMPLO. No borra suscriptores ni tarjetas.</p>
        <BotonAccion accion={reiniciar} variante="peligro" confirmar="¿Reiniciar el demo? Se borran reportes, alertas, boletines y entregas.">Reiniciar demo</BotonAccion>
      </section>
    </div>
  );
}

const haceCuanto = (iso: string) => {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return h < 1 ? "hace menos de 1 h" : h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
};

/** Problemas activos: reportes confirmados agrupados por factor, con envío de la tarjeta a todas esas comunidades. */
function ProblemasActivos({ problemas, migracionPendiente }: Awaited<ReturnType<typeof problemasActivos>>) {
  return (
    <section className="rounded-lg bg-superficie border border-borde" aria-labelledby="problemas">
      <h2 id="problemas" className="px-4 pt-3 font-semibold">Problemas activos</h2>
      <p className="px-4 text-xs text-tinta-2">
        Reportes confirmados y aún no atendidos, agrupados por problema. «Enviar qué hacer» manda la tarjeta verificada
        a las personas suscritas de esas comunidades (no se repite a la misma comunidad en {HORAS_SIN_REPETIR} h).
      </p>
      {migracionPendiente && (
        <p className="mx-4 mt-2 rounded bg-ocre-suave px-3 py-2 text-sm text-ocre-tinta">
          Falta aplicar la migración <code>contratos/migraciones/2026-11-22_lesson_sends.sql</code> en Supabase para poder enviar.
        </p>
      )}
      {problemas.length === 0 ? (
        <p className="px-4 py-3 text-sm text-tinta-2">No hay reportes confirmados pendientes.</p>
      ) : (
        <ul className="divide-y divide-borde mt-2">
          {problemas.map((p) => {
            const ultimo = p.enviosRecientes.toSorted((a, b) => b.sent_at.localeCompare(a.sent_at))[0];
            return (
              <li key={p.factor} className="px-4 py-3 flex flex-wrap items-start gap-x-6 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.etiqueta}</p>
                  <p className="text-sm text-tinta">
                    <b>{p.comunidades.length}</b> {p.comunidades.length === 1 ? "comunidad" : "comunidades"} · <b>{p.familias}</b> familias
                    {p.maxDias !== null && <> · hasta <b>{p.maxDias}</b> días sin recurso</>} · el más antiguo {haceCuanto(p.desde)}
                  </p>
                  <p className="text-xs text-tinta-2 mt-0.5">{p.comunidades.map((c) => c.nombre).join(" · ")}</p>
                  <p className="text-xs text-tinta-2 mt-0.5">
                    Tarjeta: {p.tarjeta ? <a className="underline" href={`/tarjetas/${p.tarjeta.id}`}>{p.tarjeta.titulo}</a> : <i>sin tarjeta verificada para este problema</i>}
                    {ultimo && <> · último envío {haceCuanto(ultimo.sent_at)} por {ultimo.sent_by}</>}
                  </p>
                </div>
                <BotonAccion
                  accion={enviarProblema.bind(null, p.factor)}
                  deshabilitado={!p.tarjeta || migracionPendiente || p.pendientes.length === 0}
                  confirmar={`¿Enviar «${p.tarjeta?.titulo ?? ""}» a ${p.pendientes.length} ${p.pendientes.length === 1 ? "comunidad" : "comunidades"}?`}>
                  {p.pendientes.length === 0 ? "Ya enviada (24 h)" : `Enviar qué hacer (${p.pendientes.length})`}
                </BotonAccion>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
