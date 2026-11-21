import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { reportesPanel, type ReportePanel } from "@/lib/datos-publicos";
import { BotonAccion, FormAccion, FormEntrega } from "@/components/panel/Acciones";
import RefrescoAuto from "@/components/RefrescoAuto";
import { corregirReporte, decidirReporte, registrarEntregaPanel } from "../acciones";

export const metadata: Metadata = { title: "Reportes" };

const GRUPOS: { estado: string; titulo: string; ayuda: string }[] = [
  { estado: "revisar", titulo: "Por revisar", ayuda: "El bot no entendió bien (confianza baja): escucha el audio y confirma o descarta." },
  { estado: "confirmado", titulo: "Confirmados (cuentan para la prioridad)", ayuda: "Registra la entrega cuando se atienda: el bot le pregunta a la comunidad si llegó." },
  { estado: "por_confirmar", titulo: "Esperando que la persona confirme", ayuda: "El bot preguntó “¿Entendí bien?” y aún no respondieron." },
  { estado: "atendido", titulo: "Atendidos", ayuda: "" },
  { estado: "descartado", titulo: "Descartados", ayuda: "" },
];
const TIPO: Record<string, string> = { agua: "Falta de agua", forraje: "Falta de forraje", dano: "Daños", otro: "Otro" };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "short" });

export default function Reportes() {
  return (
    <Suspense fallback={<p className="text-stone-500">Cargando reportes…</p>}>
      <Lista />
    </Suspense>
  );
}

async function Lista() {
  await connection();
  const reportes = await reportesPanel();
  return (
    <div className="space-y-6">
      <RefrescoAuto segundos={20} />
      <h1 className="text-xl font-bold">Reportes de las comunidades</h1>
      {GRUPOS.map((g) => {
        const lista = reportes.filter((r) => r.status === g.estado);
        if (lista.length === 0 && (g.estado === "atendido" || g.estado === "descartado" || g.estado === "por_confirmar")) return null;
        return (
          <section key={g.estado} className="space-y-2">
            <h2 className="font-semibold">{g.titulo} <span className="text-stone-500 font-normal">({lista.length})</span></h2>
            {g.ayuda && <p className="text-xs text-stone-500">{g.ayuda}</p>}
            {lista.length === 0 ? <p className="text-sm text-stone-400">Ninguno.</p> : (
              <ul className="space-y-3">{lista.map((r) => <Reporte key={r.id} r={r} />)}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Reporte({ r }: { r: ReportePanel }) {
  const p = r.payload as Record<string, number | null>;
  return (
    <li className="rounded-lg bg-white border border-stone-200 p-3 space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
        <span className="font-semibold">{r.comunidad}</span>
        <span>{TIPO[r.type] ?? r.type}</span>
        {r.priority_score !== null && <span>Prioridad <b>{r.priority_score}</b></span>}
        <span className="text-stone-500">{fecha(r.created_at)}{r.canal ? ` · ${r.canal}` : ""}</span>
        {r.esEjemplo && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900">EJEMPLO</span>}
        {r.confidence !== null && r.confidence < 0.6 && <span className="text-red-700 text-xs">confianza {r.confidence}</span>}
      </div>
      {r.transcript && <p className="text-sm italic text-stone-700">“{r.transcript}”</p>}
      {r.audioUrl && <audio controls src={r.audioUrl} className="w-full max-w-md" />}
      <p className="text-xs text-stone-600">
        Días sin recurso: {p.dias_sin_recurso ?? "—"} · Familias: {p.familias_afectadas ?? "—"} · Animales: {p.animales_afectados ?? "—"}{r.factor ? ` · Factor: ${r.factor}` : ""}
      </p>

      {["revisar", "por_confirmar", "confirmado"].includes(r.status) && (
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-600">Corregir datos</summary>
          <FormAccion accion={corregirReporte.bind(null, r.id)} boton="Guardar corrección" className="mt-2">
            <div className="flex flex-wrap gap-3">
              {([["dias", "Días", p.dias_sin_recurso], ["familias", "Familias", p.familias_afectadas], ["animales", "Animales", p.animales_afectados]] as const).map(([n, t, v]) => (
                <label key={n} className="text-xs">{t}<input name={n} type="number" min="0" step="1" defaultValue={v ?? ""} className="block w-24 rounded border border-stone-300 px-2 py-1" /></label>
              ))}
            </div>
          </FormAccion>
        </details>
      )}

      {(r.status === "revisar" || r.status === "por_confirmar") && (
        <div className="flex gap-2">
          <BotonAccion accion={decidirReporte.bind(null, r.id, "confirmar")}>Confirmar</BotonAccion>
          <BotonAccion accion={decidirReporte.bind(null, r.id, "descartar")} variante="secundario">Descartar</BotonAccion>
        </div>
      )}
      {r.status === "confirmado" && (
        <FormEntrega accion={registrarEntregaPanel} communityId={r.community_id} reportId={r.id} sugerido={r.type === "forraje" ? "forraje" : "cisterna"} />
      )}
    </li>
  );
}
