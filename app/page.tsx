import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PESOS, TOPES } from "@/contratos/prioridad";
import { rangoFechas } from "@/contratos/tipos";
import { alertaActiva, comunidadesConPrioridad } from "@/lib/datos-publicos";
import MapaComunidades from "@/components/mapa/MapaComunidades";
import RefrescoAuto from "@/components/RefrescoAuto";
import { COLOR_URGENCIA, NOMBRE_URGENCIA, urgenciaDe } from "@/components/mapa/colores";

export default function Inicio() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <section>
        <h1 className="text-2xl font-bold">Prioridad de atención por comunidad</h1>
        <p className="text-stone-600 mt-1">
          Cada reporte confirmado por la comunidad suma a una fórmula pública. El color indica a quién atender primero
          con cisternas o forraje. Se actualiza solo.
        </p>
      </section>
      <Suspense fallback={<p className="text-stone-500">Cargando mapa…</p>}>
        <Contenido />
      </Suspense>
      <ComoSeCalcula />
    </main>
  );
}

async function Contenido() {
  await connection();
  const [comunidades, alerta] = await Promise.all([comunidadesConPrioridad(), alertaActiva()]);
  return (
    <>
      <RefrescoAuto segundos={15} />
      {alerta && (
        <section aria-label="Alerta activa" className="rounded-lg border-l-4 border-sky-700 bg-sky-50 p-4">
          <p className="font-semibold text-sky-900">
            Aviso de {alerta.hazard} · Senamhi, {rangoFechas(alerta.valid_from, alerta.valid_to)}
            {alerta.zona ? ` · ${alerta.zona}` : ""}
          </p>
          <p className="mt-1 text-sm">El boletín dice: “{alerta.cita_evento}”</p>
          {alerta.cita_riesgo && <p className="text-sm">Riesgo según el Senamhi: “{alerta.cita_riesgo}”</p>}
          {alerta.lesson_id && <Link href={`/tarjetas/${alerta.lesson_id}`} className="mt-2 inline-block text-sm text-sky-800 underline">Ver qué hacer</Link>}
        </section>
      )}
      <MapaComunidades puntos={comunidades.map(({ id, name, lat, lon, families, is_example, is_test, prioridad }) => ({ id, name, lat, lon, families, is_example, is_test, prioridad }))} />
      <Leyenda />
      <section aria-label="Ranking" className="rounded-lg bg-white border border-stone-200">
        <h2 className="px-4 pt-3 font-semibold">Ranking</h2>
        <ol className="divide-y divide-stone-100">
          {comunidades.map((c, i) => {
            const u = urgenciaDe(c.prioridad);
            return (
              <li key={c.id} className="px-4 py-2">
                <details>
                  <summary className="flex items-center gap-3 cursor-pointer list-none">
                    <span className="w-6 text-right text-stone-500 text-sm">{i + 1}</span>
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: COLOR_URGENCIA[u] }} aria-hidden />
                    <span className="font-medium">{c.name}</span>
                    {c.is_example && <Ejemplo />}
                    <span className="ml-auto text-sm">
                      {c.prioridad.estado === "activa" ? <><b>{c.prioridad.resultado.score}</b> · {NOMBRE_URGENCIA[u]}</> : <span className="text-stone-500">{NOMBRE_URGENCIA.gris}</span>}
                    </span>
                  </summary>
                  {c.prioridad.estado === "activa" ? (
                    <ul className="mt-2 ml-12 text-sm text-stone-700 list-disc">
                      {c.prioridad.resultado.desglose.map((d) => (
                        <li key={d.criterio}>{d.criterio}: <b>{d.aporte}</b>{d.nota && <i className="text-stone-500"> ({d.nota})</i>}</li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 ml-12 text-sm text-stone-500">{c.families} familias · sin reportes confirmados pendientes.</p>}
                </details>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

const Ejemplo = () => <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">EJEMPLO</span>;

function Leyenda() {
  return (
    <ul className="flex flex-wrap gap-4 text-sm" aria-label="Leyenda">
      {(["rojo", "naranja", "amarillo", "verde", "gris"] as const).map((u) => (
        <li key={u} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: COLOR_URGENCIA[u] }} aria-hidden />
          {NOMBRE_URGENCIA[u]}{u === "rojo" ? " (≥70)" : u === "naranja" ? " (≥50)" : u === "amarillo" ? " (≥30)" : u === "verde" ? " (<30)" : ""}
        </li>
      ))}
    </ul>
  );
}

function ComoSeCalcula() {
  return (
    <details id="como-se-calcula" className="rounded-lg bg-white border border-stone-200 p-4">
      <summary className="font-semibold cursor-pointer">¿Cómo se calcula la prioridad?</summary>
      <div className="mt-3 space-y-2 text-sm text-stone-700">
        <p>Se suman cuatro criterios (máximo 100 puntos). Cada uno se escala de 0 a 1 con un tope:</p>
        <ul className="list-disc ml-5">
          <li><b>Días sin agua o forraje</b>: hasta {PESOS.sinRecurso} puntos (tope {TOPES.dias} días).</li>
          <li><b>Familias afectadas</b>: hasta {PESOS.familias} puntos (tope {TOPES.familias} familias).</li>
          <li><b>Animales afectados</b>: hasta {PESOS.animales} puntos (tope {TOPES.animales} animales).</li>
          <li><b>Tiempo de espera</b> desde la confirmación: hasta {PESOS.espera} puntos (tope {TOPES.esperaDias} días).</li>
        </ul>
        <p>Si un dato falta, vale la mitad (no baja la prioridad de quien no supo decirlo). Si el reporte no trae familias o animales, se usa el dato de la comunidad.</p>
        <p>La prioridad de una comunidad es la de su reporte confirmado más alto que aún no fue atendido. La preparación de la comunidad <b>nunca</b> entra en la fórmula.</p>
        <p className="text-stone-500">Los pesos son una propuesta del equipo para el piloto; se ajustan con el municipio.</p>
      </div>
    </details>
  );
}
