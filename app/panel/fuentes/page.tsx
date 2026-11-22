import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BookPlus, CalendarCheck, ExternalLink, Link2Off, Quote } from "lucide-react";
import { Aviso, Campo } from "@/components/ui";
import { FormAccion } from "@/components/panel/Acciones";
import { editorDisponible, fuentesRegistradas } from "@/lib/editor-tarjetas";
import { fuentesDeTarjeta } from "@/lib/fuentes";
import { listarTarjetas } from "@/lib/tarjetas";
import { guardarFuente } from "../tarjetas/acciones";

export const metadata: Metadata = { title: "Fuentes" };

export default function PaginaFuentes() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando fuentes" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const [fuentes, tarjetas, disponible] = await Promise.all([fuentesRegistradas(), listarTarjetas(), editorDisponible()]);
  const usos = (id: string) => tarjetas.filter((t) => fuentesDeTarjeta(t, fuentes).some((x) => x.fuente.id === id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">Fuentes oficiales</h1>
          <p className="text-sm text-tinta-2">{fuentes.length} fuentes registradas</p>
        </div>
        <a href="#nueva-fuente" className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-marca px-3 text-sm font-semibold text-white no-underline hover:bg-marca-oscura">
          <BookPlus aria-hidden="true" className="size-4" />
          Registrar fuente
        </a>
      </header>

      <Aviso nivel="info" titulo="Reglas">
        Cada paso de una tarjeta cita una de estas fuentes, con su página. <strong>Sin un enlace que se pueda abrir, una fuente no se registra.</strong>{" "}
        Una tarjeta solo puede citar fuentes de esta lista.
      </Aviso>

      <ul className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-suave divide-y divide-borde">
        {fuentes.map((f) => {
          const u = usos(f.id);
          return (
            <li key={f.id} className="space-y-2 px-4 py-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-acento">
                    {f.institucion} · <span className="cifras">{f.anio}</span>
                  </p>
                  <p className="font-semibold leading-snug text-tinta">{f.titulo}</p>
                </div>
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-borde-fuerte px-3 text-sm font-semibold text-marca no-underline hover:bg-marca-suave"
                  >
                    <ExternalLink aria-hidden="true" className="size-4" />
                    Abrir el original
                  </a>
                ) : (
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-roja-suave px-3 text-sm font-semibold text-roja-tinta">
                    <Link2Off aria-hidden="true" className="size-4" />
                    Enlace por confirmar
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2">
                <span className="inline-flex items-center gap-1">
                  <CalendarCheck aria-hidden="true" className="size-3.5" />
                  Consultada el <span className="cifras">{f.consultado}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Quote aria-hidden="true" className="size-3.5" />
                  Se cita como «{f.claves[0]}»
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {u.length ? (
                  <>
                    <span className="text-tinta-2">La usan:</span>
                    {u.map((t) => (
                      <Link key={t.id} href={`/tarjetas/${t.id}`} className="rounded-md bg-superficie-2 px-2 py-0.5 text-tinta no-underline hover:bg-marca-suave">
                        {t.title}
                      </Link>
                    ))}
                  </>
                ) : (
                  <span className="text-tinta-2">Ninguna tarjeta la usa todavía.</span>
                )}
              </div>
              {f.nota && <p className="text-xs text-tinta-2">{f.nota}</p>}
            </li>
          );
        })}
      </ul>

      <section id="nueva-fuente" aria-labelledby="t-nueva" className="scroll-mt-4 space-y-3 rounded-xl border border-borde border-t-4 border-t-marca bg-superficie p-5 shadow-suave">
        <div>
          <h2 id="t-nueva" className="flex items-center gap-2 text-lg font-semibold">
            <BookPlus aria-hidden="true" className="size-5 text-marca" />
            Registrar una fuente nueva
          </h2>
          <p className="text-sm text-tinta-2">Solo editor o admin. Abre el enlace antes de registrarlo.</p>
        </div>
        {!disponible ? (
          <Aviso nivel="atencion">Hay que aplicar la migración <code>2026-11-22_editor_tarjetas.sql</code> para registrar fuentes desde aquí.</Aviso>
        ) : (
          <FormAccion accion={guardarFuente} boton="Registrar fuente" icono={<BookPlus aria-hidden="true" className="size-4" />} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Campo etiqueta="Institución" name="institucion" required placeholder="VIDECI" />
              <Campo etiqueta="Año" name="anio" type="number" required min={1990} max={2100} />
            </div>
            <Campo etiqueta="Título del documento" name="titulo" required />
            <Campo etiqueta="Enlace al original" name="url" type="url" required placeholder="https://…" />
            <Campo etiqueta="Cómo se cita en las tarjetas" name="clave" required placeholder="VIDECI, Guía de preparación ante nevadas" ayuda="Este texto debe aparecer igual en la cita de cada paso." />
            <Campo etiqueta="Nota (opcional)" name="nota" />
          </FormAccion>
        )}
      </section>
    </div>
  );
}
