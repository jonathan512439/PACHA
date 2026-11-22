import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { listarFuentes } from "@/lib/fuentes";

export const metadata: Metadata = {
  title: "Fuentes",
  description: "Documentos usados para escribir las recomendaciones, con enlace y fecha de consulta.",
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
          Documentos usados para escribir las recomendaciones.
        </p>
      </header>
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
