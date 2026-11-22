import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import { fechaLarga, rangoFechas } from "@/contratos/tipos";
import { listarFuentes } from "@/lib/fuentes";
import { boletinesPublicos } from "@/lib/datos-publicos";

export const metadata: Metadata = {
  title: "Fuentes",
  description: "Boletines y comunicados del Senamhi usados para las alertas, y documentos de las recomendaciones.",
};

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/** Lista pública de fuentes (data/fuentes.json, de SERVIDOR). Estática: cambia solo con cada despliegue. */
export default function PaginaFuentes() {
  const fuentes = listarFuentes();
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
      <header className="max-w-prose space-y-2">
        <h1 className="text-4xl font-semibold">Fuentes</h1>
        <p className="text-lg text-tinta-2">
          Boletines y comunicados del Senamhi usados para las alertas, y documentos usados para escribir las recomendaciones.
        </p>
      </header>

      <section aria-labelledby="boletines-titulo" className="space-y-3">
        <h2 id="boletines-titulo" className="text-2xl font-semibold">Boletines y comunicados del Senamhi</h2>
        <Suspense fallback={<div className="h-32 rounded-xl border border-borde bg-superficie-2" role="status" aria-label="Cargando los boletines" />}>
          <Boletines />
        </Suspense>
      </section>

      <h2 className="text-2xl font-semibold">Documentos de las recomendaciones</h2>
      <ol className="space-y-4">
        {fuentes.map((f) => (
          <li key={f.id} className="rounded-xl border border-borde bg-superficie p-5 shadow-suave">
            <p className="text-sm font-bold uppercase tracking-wider text-acento">
              {f.institucion} · <span className="cifras">{f.anio}</span>
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-snug">{f.titulo}</h2>
            <div className="mt-3 space-y-1.5 text-sm text-tinta">
              {f.url ? (
                <p>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center font-semibold text-marca underline">
                    Abrir documento
                    <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5 align-[-2px]" />
                    <span className="sr-only"> (abre en otra pestaña)</span>
                  </a>
                </p>
              ) : (
                <p className="font-semibold text-ocre-tinta">Enlace por confirmar{f.nota ? `: ${f.nota}` : "."}</p>
              )}
              {f.url && f.nota && <p className="text-tinta-2">{f.nota}</p>}
              <p className="text-tinta-2">Consultado el {fecha(f.consultado)}.</p>
              {f.tarjetas.length > 0 && (
                <p>
                  <span className="text-tinta-2">Tarjetas que la usan: </span>
                  {f.tarjetas.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ", "}
                      <Link href={`/tarjetas/${id}`} className="text-marca underline">{id}</Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

const FENOMENO: Record<string, string> = { helada: "Helada", nevada: "Nevada", sequia: "Sequía" };
const NIVEL: Record<string, string> = { rojo: "roja", naranja: "naranja", amarillo: "amarilla" };

function resultado(b: Awaited<ReturnType<typeof boletinesPublicos>>[number]): string {
  if (!b.alerta) return b.fenomeno ? `${FENOMENO[b.fenomeno] ?? b.fenomeno}: sin alerta` : "Sin alerta";
  const nivel = b.alerta.nivel ? `alerta ${NIVEL[b.alerta.nivel] ?? b.alerta.nivel}` : b.alerta.riesgo ? `alerta por riesgo ${b.alerta.riesgo}` : "alerta";
  const estado = b.alerta.estado === "enviada" ? "enviada" : b.alerta.estado === "aprobada" ? "aprobada" : "en revisión";
  return `${FENOMENO[b.fenomeno ?? ""] ?? "Aviso"}: ${nivel} (${estado})`;
}

async function Boletines() {
  await connection();
  const lista = await boletinesPublicos();
  if (lista.length === 0) return <p className="text-tinta-2">Todavía no se procesó ningún boletín.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-superficie">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="border-b border-borde bg-superficie-2 text-tinta">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">Periodo</th>
            <th scope="col" className="px-4 py-2 font-semibold">Documento</th>
            <th scope="col" className="px-4 py-2 font-semibold">Resultado</th>
            <th scope="col" className="px-4 py-2 font-semibold">Enlaces</th>
          </tr>
        </thead>
        <tbody className="cifras divide-y divide-borde">
          {lista.map((b) => (
            <tr key={b.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3">{b.desde && b.hasta ? (b.desde === b.hasta ? fechaLarga(b.desde) : rangoFechas(b.desde, b.hasta)) : "—"}</td>
              <td className="px-4 py-3">
                {b.tipo === "comunicado" ? "Comunicado del Senamhi" : "Boletín agrometeorológico decenal · Altiplano"}
                {b.ejemplo && <span className="block text-xs text-tinta-2">{b.tipo === "comunicado" ? "Simulacro" : "Documento histórico usado de ejemplo"}</span>}
              </td>
              <td className="px-4 py-3">{resultado(b)}</td>
              <td className="px-4 py-3">
                <span className="flex flex-col gap-1">
                  {b.original && (
                    <a href={b.original} target="_blank" rel="noopener noreferrer" className="text-marca underline">
                      Original<span className="sr-only"> (abre en otra pestaña)</span>
                    </a>
                  )}
                  {b.copia && (
                    <a href={b.copia} target="_blank" rel="noopener noreferrer" className="text-marca underline">
                      Copia guardada (PDF)<span className="sr-only"> (abre en otra pestaña)</span>
                    </a>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
