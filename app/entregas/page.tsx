import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { entregasPublicas } from "@/lib/datos-publicos";
import RefrescoAuto from "@/components/RefrescoAuto";

export const metadata: Metadata = { title: "Entregas" };

const fecha = (iso: string) => new Date(iso).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short" });

export default function Entregas() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Entregas</h1>
      <p className="text-stone-600">
        Cada cisterna o entrega de forraje queda registrada con fecha, foto y la prioridad del reporte que la originó.
        La comunidad confirma por el bot si llegó.
      </p>
      <Suspense fallback={<p className="text-stone-500">Cargando entregas…</p>}>
        <Lista />
      </Suspense>
    </main>
  );
}

async function Lista() {
  await connection();
  const entregas = await entregasPublicas();
  if (entregas.length === 0) return <p className="text-stone-500">Todavía no hay entregas registradas.</p>;
  return (
    <>
      <RefrescoAuto segundos={20} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entregas.map((e) => (
          <li key={e.id} className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            {e.fotoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen pública de Supabase Storage */}
                <img src={e.fotoUrl} alt={`Entrega en ${e.comunidad}`} className="h-40 w-full object-cover" />
                {e.is_example && <span className="absolute left-2 top-2 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900">FOTO DE EJEMPLO</span>}
              </div>
            ) : <div className="h-40 bg-stone-100 grid place-items-center text-sm text-stone-500">Sin foto</div>}
            <div className="p-3 space-y-1 text-sm">
              <p className="font-semibold text-base">
                {e.kind === "cisterna" ? `${e.quantity} ${e.quantity === 1 ? "cisterna" : "cisternas"} de agua` : `${e.quantity} kg de forraje`}
              </p>
              <p>{e.comunidad} {e.is_example && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900">EJEMPLO</span>}</p>
              <p className="text-stone-500">{fecha(e.delivered_at)}</p>
              {e.prioridadOrigen !== null && <p>Prioridad del reporte: <b>{e.prioridadOrigen}</b></p>}
              <p className={e.confirmed_by_community === true ? "text-emerald-700 font-semibold" : e.confirmed_by_community === false ? "text-red-700 font-semibold" : "text-stone-500"}>
                {e.confirmed_by_community === true ? "✅ La comunidad confirmó que llegó" : e.confirmed_by_community === false ? "❌ La comunidad dice que NO llegó" : "⏳ Sin respuesta de la comunidad"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
