import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { entregasPublicas } from "@/lib/datos-publicos";
import { textoEntrega } from "@/lib/visibilidad-calculo";
import RefrescoAuto from "@/components/RefrescoAuto";
import { Insignia } from "@/components/ui/Insignia";
import { Vacio } from "@/components/ui/Vacio";
import { fechaHora } from "@/components/ui/formato";

export const metadata: Metadata = {
  title: "Entregas",
  description: "Registro de entregas de agua y forraje, y la confirmación de cada comunidad.",
};

const CONFIRMACION = {
  llego: { tipo: "llego", texto: "Recibida" },
  "no-llego": { tipo: "no-llego", texto: "No recibida" },
  "sin-respuesta": { tipo: "sin-respuesta", texto: "Sin confirmar" },
} as const;

export default function Entregas() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Entregas</h1>
        <p className="text-lg text-tinta-2">Registro de entregas de agua y forraje, y la confirmación de cada comunidad.</p>
      </header>
      <Suspense fallback={<div className="h-96 rounded-xl border border-borde bg-superficie-2" role="status" aria-label="Cargando las entregas" />}>
        <Registro />
      </Suspense>
    </main>
  );
}

async function Registro() {
  await connection();
  const entregas = await entregasPublicas();
  if (entregas.length === 0) return <Vacio titulo="Todavía no hay entregas registradas." />;
  const cuenta = {
    llego: entregas.filter((e) => e.confirmed_by_community === true).length,
    noLlego: entregas.filter((e) => e.confirmed_by_community === false).length,
    sin: entregas.filter((e) => e.confirmed_by_community === null).length,
  };
  const resumen = [
    { valor: entregas.length, texto: "entregas registradas" },
    { valor: cuenta.llego, texto: "recibidas" },
    { valor: cuenta.noLlego, texto: "no recibidas" },
    { valor: cuenta.sin, texto: "sin confirmar" },
  ];
  return (
    <>
      <RefrescoAuto segundos={20} />
      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-borde bg-superficie sm:grid-cols-4 sm:divide-x sm:divide-borde">
        {resumen.map((r) => (
          <div key={r.texto} className="flex flex-col-reverse px-4 py-3">
            <dt className="text-sm text-tinta-2">{r.texto}</dt>
            <dd className="cifras text-2xl font-semibold text-tinta">{r.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">Entregas registradas, de la más reciente a la más antigua</caption>
          <thead className="border-b border-borde bg-superficie-2 text-tinta">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">Fecha</th>
              <th scope="col" className="px-4 py-2 font-semibold">Comunidad</th>
              <th scope="col" className="px-4 py-2 font-semibold">Entrega</th>
              <th scope="col" className="px-4 py-2 font-semibold">Confirmación de la comunidad</th>
              <th scope="col" className="px-4 py-2 font-semibold">Foto</th>
            </tr>
          </thead>
          <tbody className="cifras divide-y divide-borde">
            {entregas.map((e) => {
              const c = CONFIRMACION[e.confirmed_by_community === true ? "llego" : e.confirmed_by_community === false ? "no-llego" : "sin-respuesta"];
              return (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-tinta-2">{fechaHora(e.delivered_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/comunidad/${e.community_id}`} className="font-medium text-marca underline">{e.comunidad}</Link>
                  </td>
                  <td className="px-4 py-3">{textoEntrega(e)}</td>
                  <td className="px-4 py-3">
                    <Insignia tipo={c.tipo}>{c.texto}</Insignia>
                    {e.confirmed_at && e.confirmed_by_community !== null && (
                      <span className="mt-1 block text-xs text-tinta-2">{fechaHora(e.confirmed_at)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {e.fotoUrl ? (
                      <a href={e.fotoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-marca underline">
                        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura pública de Supabase Storage */}
                        <img src={e.fotoUrl} alt="" loading="lazy" className="size-10 rounded border border-borde object-cover" />
                        Ver<span className="sr-only"> la foto de la entrega en {e.comunidad} (abre en otra pestaña)</span>
                      </a>
                    ) : (
                      <span className="text-tinta-2">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
