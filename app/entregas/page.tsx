import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ImageOff } from "lucide-react";
import { entregasPublicas } from "@/lib/datos-publicos";
import { textoEntrega } from "@/lib/visibilidad-calculo";
import RefrescoAuto from "@/components/RefrescoAuto";
import { Insignia } from "@/components/ui/Insignia";
import { Vacio } from "@/components/ui/Vacio";
import { fechaHora } from "@/components/ui/formato";

export const metadata: Metadata = {
  title: "Entregas",
  description: "Cada cisterna o entrega de forraje con foto, cantidad y la respuesta de la comunidad: llegó o no llegó.",
};

const RESPUESTA = {
  llego: { tipo: "llego", texto: "La comunidad confirmó que llegó" },
  "no-llego": { tipo: "no-llego", texto: "La comunidad dice que NO llegó" },
  "sin-respuesta": { tipo: "sin-respuesta", texto: "Sin respuesta de la comunidad" },
} as const;

export default function Entregas() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
      <header className="max-w-prose space-y-2">
        <h1 className="text-4xl font-semibold">Entregas</h1>
        <p className="text-lg text-tinta-2">
          Cada cisterna o entrega de forraje queda registrada con fecha, foto y la prioridad del reporte que la originó. La comunidad responde por el
          bot si llegó o no.
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando las entregas" />}>
        <Lista />
      </Suspense>
    </main>
  );
}

async function Lista() {
  await connection();
  const entregas = await entregasPublicas();
  if (entregas.length === 0) return <Vacio titulo="Todavía no hay entregas registradas.">Cuando la técnica registre una, aparece aquí con su foto.</Vacio>;
  const cuenta = {
    llego: entregas.filter((e) => e.confirmed_by_community === true).length,
    noLlego: entregas.filter((e) => e.confirmed_by_community === false).length,
    sin: entregas.filter((e) => e.confirmed_by_community === null).length,
  };
  return (
    <>
      <RefrescoAuto segundos={20} />
      <p className="flex flex-wrap items-center gap-2 text-sm text-tinta">
        <span className="cifras font-semibold">{entregas.length} entregas:</span>
        <Insignia tipo="llego">{cuenta.llego} {cuenta.llego === 1 ? "llegó" : "llegaron"}</Insignia>
        <Insignia tipo="no-llego">{cuenta.noLlego} no {cuenta.noLlego === 1 ? "llegó" : "llegaron"}</Insignia>
        <Insignia tipo="sin-respuesta">{cuenta.sin} sin respuesta</Insignia>
      </p>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entregas.map((e) => {
          const r = RESPUESTA[e.confirmed_by_community === true ? "llego" : e.confirmed_by_community === false ? "no-llego" : "sin-respuesta"];
          return (
            <li key={e.id} className="flex flex-col overflow-hidden rounded-xl border border-borde bg-superficie shadow-suave">
              <div className={e.fotoUrl ? "relative aspect-[4/3] bg-superficie-2" : "relative h-16 bg-superficie-2"}>
                {e.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagen pública de Supabase Storage
                  <img src={e.fotoUrl} alt={`Foto de la entrega en ${e.comunidad}`} loading="lazy" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center gap-2 text-sm text-tinta-2">
                    <ImageOff aria-hidden="true" className="size-5" />
                    Sin foto
                  </div>
                )}
                {e.is_example && e.fotoUrl && <Insignia tipo="ejemplo" className="absolute left-2 top-2">FOTO DE EJEMPLO</Insignia>}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4 text-sm">
                <p className="font-titulo text-xl font-semibold leading-snug">{textoEntrega(e)}</p>
                <p className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/comunidad/${e.community_id}`} className="font-semibold text-marca underline">{e.comunidad}</Link>
                  {e.is_example && <Insignia tipo="ejemplo" />}
                </p>
                <p className="cifras text-tinta-2">Entregada el {fechaHora(e.delivered_at)}</p>
                {e.prioridadOrigen !== null && (
                  <p className="text-tinta-2">Prioridad del reporte: <b className="cifras text-tinta">{String(e.prioridadOrigen).replace(".", ",")}</b></p>
                )}
                <div className="mt-auto border-t border-borde pt-3">
                  <Insignia tipo={r.tipo} className="px-2.5 py-1 text-sm">{r.texto}</Insignia>
                  {e.confirmed_at && e.confirmed_by_community !== null && (
                    <p className="cifras mt-1 text-xs text-tinta-2">Respondió el {fechaHora(e.confirmed_at)}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
