import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { rangoFechas } from "@/contratos/tipos";
import { alertasPanel } from "@/lib/datos-publicos";
import { BotonAccion, FormAccion } from "@/components/panel/Acciones";
import { aprobar, buscarBoletinAhora, crearComunicado, descartar, enviar, subirBoletin } from "../acciones";
import { hoyBolivia } from "@/components/ui/formato";
import { CampoArchivo } from "@/components/ui/CampoArchivo";
import { ChevronDown, FileUp } from "lucide-react";

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
          (También se revisa solo cada 30 minutos.)
        </p>
        <BotonAccion accion={buscarBoletinAhora}>Buscar boletín ahora</BotonAccion>
        <details className="group rounded-lg border border-borde bg-superficie-2 text-sm open:bg-superficie">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 font-semibold text-marca [&::-webkit-details-marker]:hidden">
            <FileUp aria-hidden="true" className="size-4" />
            Respaldo: subir el PDF a mano
            <ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" />
          </summary>
          <FormAccion accion={subirBoletin} boton="Procesar PDF" className="space-y-3 border-t border-borde p-3">
            <CampoArchivo name="pdf" etiqueta="PDF del boletín" accept="application/pdf" required ayuda="Boletín agrometeorológico decenal del Senamhi (PDF)." />
            <label className="flex min-h-10 items-center gap-2"><input type="checkbox" name="ejemplo" value="1" className="size-4 accent-marca" /> Es un boletín histórico (se marca EJEMPLO)</label>
          </FormAccion>
        </details>
      </section>
      <Suspense fallback={<p className="text-tinta-2">Cargando…</p>}>
        <Comunicado />
      </Suspense>
      <Suspense fallback={<p className="text-tinta-2">Cargando alertas…</p>}>
        <Lista />
      </Suspense>
    </div>
  );
}

const CAMPO = "block w-full rounded-md border border-borde-fuerte bg-superficie px-3 py-2 text-sm text-tinta";

/** Comunicado de última hora: 3 pasos (cargar → aprobar → enviar). Sin IA: el texto se copia del comunicado oficial. */
async function Comunicado() {
  await connection();
  const hoy = hoyBolivia();
  return (
    <section className="rounded-lg bg-superficie border border-borde p-4 space-y-3" aria-labelledby="comunicado-titulo">
      <h2 id="comunicado-titulo" className="text-xl font-semibold">Comunicado de última hora</h2>
      <p className="text-sm text-tinta-2">
        Si el Senamhi u otra institución emite un aviso urgente, cárgalo aquí. Se crea una alerta en borrador; luego pulsa
        <b> Aprobar</b> y <b>Enviar</b>. El texto debe ser el del comunicado, sin cambios.
      </p>
      <FormAccion accion={crearComunicado} boton="Crear alerta en borrador" className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Fenómeno
          <select name="fenomeno" required className={CAMPO} defaultValue="helada">
            <option value="helada">Helada</option><option value="nevada">Nevada</option><option value="sequia">Sequía</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Nivel del comunicado
          <select name="nivel" required className={CAMPO} defaultValue="naranja">
            <option value="amarillo">Amarillo</option><option value="naranja">Naranja</option><option value="rojo">Rojo</option>
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Zona
          <input name="zona" defaultValue="Altiplano de Oruro" maxLength={120} className={CAMPO} />
        </label>
        <label className="text-sm font-semibold">Desde
          <input type="date" name="desde" required defaultValue={hoy} className={CAMPO} />
        </label>
        <label className="text-sm font-semibold">Hasta
          <input type="date" name="hasta" required defaultValue={hoy} className={CAMPO} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Texto del comunicado (copiado tal cual, máx. 200 caracteres)
          <textarea name="texto" required minLength={10} maxLength={200} rows={3} className={CAMPO} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Enlace al comunicado oficial del Senamhi
          <input type="url" name="enlace" required placeholder="https://senamhi.gob.bo/…" className={CAMPO} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="simulacro" value="1" /> Es un simulacro (el mensaje y el audio dirán SIMULACRO)
        </label>
      </FormAccion>
    </section>
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
              {a.boletin?.source_url && <a href={a.boletin.source_url} target="_blank" rel="noreferrer" className="text-sm text-marca underline">Fuente original</a>}
              {a.boletin?.pdfUrl && <a href={a.boletin.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-verde-tinta underline">Copia guardada (PDF)</a>}
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
