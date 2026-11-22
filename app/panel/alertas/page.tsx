import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { rangoFechas } from "@/contratos/tipos";
import { alertasPanel } from "@/lib/datos-publicos";
import { BotonAccion, FormAccion } from "@/components/panel/Acciones";
import { aprobar, buscarBoletinAhora, descartar, enviar, subirBoletin } from "../acciones";

export const metadata: Metadata = { title: "Alertas" };

const ESTADO: Record<string, string> = {
  borrador: "bg-ocre-suave text-ocre-tinta", aprobada: "bg-marca-suave text-marca", enviada: "bg-verde-suave text-verde-tinta", descartada: "bg-superficie-2 text-tinta",
};

export default function Alertas() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-superficie border border-borde p-4 space-y-3">
        <h1 className="text-2xl font-semibold">Boletín del Senamhi</h1>
        <p className="text-sm text-tinta-2">
          Busca el boletín agrometeorológico decenal más reciente del Altiplano. La IA solo extrae los datos y las citas;
          el código decide si corresponde alertar y la alerta queda en <b>borrador</b> hasta que una persona la aprueba.
          (También corre solo todos los días a las 07:00.)
        </p>
        <BotonAccion accion={buscarBoletinAhora}>Buscar boletín ahora</BotonAccion>
        <details className="text-sm">
          <summary className="cursor-pointer text-tinta-2">Respaldo: subir el PDF a mano</summary>
          <FormAccion accion={subirBoletin} boton="Procesar PDF" className="mt-2">
            <input type="file" name="pdf" accept="application/pdf" required className="block text-sm" />
            <label className="flex items-center gap-2"><input type="checkbox" name="ejemplo" value="1" /> Es un boletín histórico (se marca EJEMPLO)</label>
          </FormAccion>
        </details>
      </section>
      <Suspense fallback={<p className="text-tinta-2">Cargando alertas…</p>}>
        <Lista />
      </Suspense>
    </div>
  );
}

const DATOS: [string, string][] = [
  ["zona", "Zona"], ["fenomeno", "Fenómeno"], ["riesgo_helada", "Riesgo de helada"], ["temp_minima_c", "Mínima (°C)"],
  ["periodo_inicio", "Desde"], ["periodo_fin", "Hasta"], ["nivel_senamhi", "Nivel Senamhi"], ["confianza", "Confianza de la extracción"],
];

async function Lista() {
  await connection();
  const alertas = await alertasPanel();
  if (alertas.length === 0) return <p className="text-tinta-2">Todavía no hay alertas. Usa “Buscar boletín ahora”.</p>;
  return (
    <ul className="space-y-4">
      {alertas.map((a) => {
        const bloqueada = !a.tarjeta.lista; // estado actual de la tarjeta (se recalcula en cada carga)
        const x = a.boletin?.extracted ?? {};
        return (
          <li key={a.id} className="rounded-lg bg-superficie border border-borde p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${ESTADO[a.status] ?? ""}`}>{a.status}</span>
              <h2 className="font-semibold">Aviso de {a.hazard} · {rangoFechas(a.valid_from, a.valid_to)}</h2>
              {a.boletin?.pdfUrl && <a href={a.boletin.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-verde-tinta underline">Ver PDF del boletín</a>}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <p><b>Decisión del código:</b> {a.decision_reason.replace(/ Falta la tarjeta .*$/, "")}</p>
                <p className={bloqueada ? "text-roja" : "text-verde-tinta"}>
                  <b>Tarjeta de la alerta:</b> {a.tarjeta.id} — {bloqueada
                    ? `está en "${a.tarjeta.estado}": hay que verificarla para poder aprobar.`
                    : "lista. Al aprobar, el mensaje se completa con sus 3 pasos."}
                </p>
                <blockquote className="border-l-4 border-borde-fuerte pl-3"><span className="text-xs text-tinta-2">Cita del evento (literal)</span><br />“{a.cita_evento}”</blockquote>
                {a.cita_riesgo && <blockquote className="border-l-4 border-borde-fuerte pl-3"><span className="text-xs text-tinta-2">Cita del riesgo (literal)</span><br />“{a.cita_riesgo}”</blockquote>}
                <table className="text-sm"><tbody>
                  {DATOS.map(([k, t]) => x[k] !== undefined && x[k] !== null ? <tr key={k}><td className="pr-3 text-tinta-2">{t}</td><td>{String(x[k])}</td></tr> : null)}
                </tbody></table>
                <p className="text-xs text-tinta-2">Compara cada dato con su cita y con el PDF antes de aprobar.</p>
              </div>
              <div>
                <p className="text-xs text-tinta-2 mb-1">Mensaje que se enviará (armado por plantilla, no por IA)</p>
                <pre className="whitespace-pre-wrap rounded bg-superficie-2 border border-borde p-3 text-sm font-sans">{a.message_text}</pre>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              {a.status === "borrador" && (
                <BotonAccion accion={aprobar.bind(null, a.id)} deshabilitado={bloqueada}>
                  {bloqueada ? "Aprobar (falta verificar la tarjeta)" : "Aprobar"}
                </BotonAccion>
              )}
              {(a.status === "aprobada" || a.status === "enviada") && (
                <BotonAccion accion={enviar.bind(null, a.id)} confirmar={a.status === "enviada" ? "¿Reintentar el envío a quienes fallaron?" : "¿Enviar la alerta a todas las personas suscritas de la zona?"}>
                  {a.status === "enviada" ? "Reintentar fallidos" : "Enviar"}
                </BotonAccion>
              )}
              {(a.status === "borrador" || a.status === "aprobada") && (
                <BotonAccion accion={descartar.bind(null, a.id)} variante="secundario" confirmar="¿Descartar esta alerta?">Descartar</BotonAccion>
              )}
              <p className="text-sm text-tinta-2 self-center">
                {a.approved_by && <>Aprobada por <b>{a.approved_by}</b>. </>}
                {a.status === "enviada" && <>Entregados: <b>{a.envios.enviado}</b> · fallidos: <b>{a.envios.fallido}</b></>}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
