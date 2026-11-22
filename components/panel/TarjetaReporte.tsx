import Link from "next/link";
import { Check, ChevronDown, Droplets, Hammer, HelpCircle, Mic, Pencil, Save, TriangleAlert, Wheat, X, type LucideIcon } from "lucide-react";
import { urgencia } from "@/contratos/prioridad";
import type { ReportePanel } from "@/lib/datos-publicos";
import { etiquetaFactor } from "@/lib/problemas-agrupar";
import { BotonAccion, FormAccion, FormEntrega } from "@/components/panel/Acciones";
import { Insignia } from "@/components/ui/Insignia";
import { CLASES_CONTROL } from "@/components/ui/Campo";
import { cx } from "@/components/ui/cx";
import { corregirReporte, decidirReporte, registrarEntregaPanel } from "@/app/panel/acciones";

const TIPO: Record<string, { texto: string; Icono: LucideIcon }> = {
  agua: { texto: "Falta de agua", Icono: Droplets },
  forraje: { texto: "Falta de forraje", Icono: Wheat },
  dano: { texto: "Daños", Icono: Hammer },
  otro: { texto: "Otro", Icono: HelpCircle },
};
const fecha = (iso: string) => new Date(iso).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "short" });

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number | null | undefined }) {
  return (
    <div className="rounded-md bg-superficie-2 px-3 py-2">
      <dt className="text-xs text-tinta-2">{etiqueta}</dt>
      <dd className="cifras font-titulo text-xl font-semibold leading-tight text-tinta">{valor ?? "—"}</dd>
    </div>
  );
}

/** Un reporte en el panel: datos, transcripción, audio y acciones según su estado. */
export function TarjetaReporte({ r, borde }: { r: ReportePanel; borde: string }) {
  const p = r.payload as Record<string, number | null>;
  const tipo = TIPO[r.type] ?? { texto: r.type, Icono: HelpCircle };
  const abierto = ["revisar", "por_confirmar", "confirmado"].includes(r.status);
  const confianzaBaja = r.confidence !== null && r.confidence < 0.6;
  return (
    <li className={cx("space-y-3 rounded-xl border border-borde border-l-4 bg-superficie p-4 shadow-suave", borde)}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/comunidad/${r.community_id}`} className="text-base font-semibold text-tinta underline decoration-borde-fuerte underline-offset-4 hover:decoration-marca">
              {r.comunidad}
            </Link>
            <span className="inline-flex items-center gap-1 rounded-md bg-marca-suave px-2 py-0.5 text-xs font-semibold text-marca">
              <tipo.Icono aria-hidden="true" className="size-3.5" />
              {tipo.texto}
            </span>
            {r.esEjemplo && <Insignia tipo="ejemplo" />}
            {confianzaBaja && (
              <span className="inline-flex items-center gap-1 rounded-md border border-naranja bg-naranja-suave px-2 py-0.5 text-xs font-semibold text-naranja-tinta">
                <TriangleAlert aria-hidden="true" className="size-3.5" />
                Confianza baja ({String(r.confidence).replace(".", ",")}): escucha el audio
              </span>
            )}
          </p>
          <p className="cifras text-xs text-tinta-2">
            {fecha(r.created_at)}
            {r.canal ? ` · por ${r.canal}` : ""}
            {r.factor ? ` · ${etiquetaFactor(r.factor)}` : ""}
          </p>
        </div>
        {r.priority_score !== null && (
          <div className="text-right">
            <Insignia tipo={`nivel-${urgencia(r.priority_score)}`}>Prioridad {String(r.priority_score).replace(".", ",")}</Insignia>
          </div>
        )}
      </div>

      {(r.transcript || r.audioUrl) && (
        <div className="space-y-2 rounded-lg border-l-2 border-borde-fuerte bg-fondo px-3 py-2">
          {r.transcript && (
            <p className="flex gap-2 text-sm text-tinta">
              <Mic aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tinta-2" />
              <span className="italic">“{r.transcript}”</span>
            </p>
          )}
          {r.audioUrl && <audio controls src={r.audioUrl} className="h-10 w-full max-w-md" />}
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2 sm:max-w-md">
        <Dato etiqueta="Días sin recurso" valor={p.dias_sin_recurso} />
        <Dato etiqueta="Familias" valor={p.familias_afectadas} />
        <Dato etiqueta="Animales" valor={p.animales_afectados} />
      </dl>

      {(r.status === "revisar" || r.status === "por_confirmar") && (
        <div className="flex flex-wrap gap-2 border-t border-borde pt-3">
          <BotonAccion accion={decidirReporte.bind(null, r.id, "confirmar")} icono={<Check aria-hidden="true" className="size-4" />}>Confirmar</BotonAccion>
          <BotonAccion accion={decidirReporte.bind(null, r.id, "descartar")} variante="secundario" icono={<X aria-hidden="true" className="size-4" />}>Descartar</BotonAccion>
        </div>
      )}

      {r.status === "confirmado" && (
        <FormEntrega accion={registrarEntregaPanel} communityId={r.community_id} reportId={r.id} sugerido={r.type === "forraje" ? "forraje" : "cisterna"} />
      )}

      {abierto && (
        <details className="group rounded-lg border border-borde text-sm">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 font-semibold text-marca [&::-webkit-details-marker]:hidden">
            <Pencil aria-hidden="true" className="size-4" />
            Corregir datos
            <ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" />
          </summary>
          <FormAccion
            accion={corregirReporte.bind(null, r.id)}
            boton="Guardar corrección"
            variante="secundario"
            icono={<Save aria-hidden="true" className="size-4" />}
            className="space-y-3 border-t border-borde p-3"
          >
            <div className="grid grid-cols-3 gap-3 sm:max-w-md">
              {([["dias", "Días", p.dias_sin_recurso], ["familias", "Familias", p.familias_afectadas], ["animales", "Animales", p.animales_afectados]] as const).map(([n, t, v]) => (
                <label key={n} className="block space-y-1.5 text-sm font-semibold text-tinta">
                  <span>{t}</span>
                  <input name={n} type="number" min="0" step="1" defaultValue={v ?? ""} className={CLASES_CONTROL} />
                </label>
              ))}
            </div>
          </FormAccion>
        </details>
      )}
    </li>
  );
}
