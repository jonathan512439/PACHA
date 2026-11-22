import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Aviso, CLASES_CONTROL } from "@/components/ui";
import { FormAccion } from "@/components/panel/Acciones";
import { editorDisponible, fuentesRegistradas } from "@/lib/editor-tarjetas";
import { fuentesDeTarjeta } from "@/lib/fuentes";
import { listarTarjetas } from "@/lib/tarjetas";
import { guardarFuente } from "../tarjetas/acciones";

export const metadata: Metadata = { title: "Fuentes" };

export default function PaginaFuentes() {
  return (
    <Suspense fallback={<p className="text-tinta-2">Cargando fuentes…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await connection();
  const [fuentes, tarjetas, disponible] = await Promise.all([fuentesRegistradas(), listarTarjetas(), editorDisponible()]);
  const usos = (id: string) => tarjetas.filter((t) => fuentesDeTarjeta(t, fuentes).some((x) => x.fuente.id === id)).map((t) => t.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Fuentes oficiales</h1>
      <p className="text-tinta-2">
        Cada paso de una tarjeta cita una de estas fuentes, con su página. <strong>Sin un enlace que se pueda abrir, una fuente no se
        registra.</strong> Una tarjeta solo puede citar fuentes de esta lista.
      </p>

      <ul className="space-y-2">
        {fuentes.map((f) => {
          const u = usos(f.id);
          return (
            <li key={f.id} className="rounded-lg border border-borde bg-superficie p-3 space-y-1">
              <p className="font-semibold">{f.institucion} ({f.anio}) · {f.titulo}</p>
              <p className="text-sm">
                {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="underline">Abrir el original</a> : <span className="text-roja-tinta">Enlace por confirmar</span>}
                {" · "}consultada el {f.consultado} · se cita como «{f.claves[0]}»
              </p>
              <p className="text-sm text-tinta-2">{u.length ? `La usan: ${u.join(", ")}` : "Ninguna tarjeta la usa todavía."}{f.nota ? ` ${f.nota}` : ""}</p>
            </li>
          );
        })}
      </ul>

      <section className="space-y-2 rounded-lg border-2 border-marca p-4">
        <h2 className="text-lg font-semibold">Registrar una fuente nueva (editor o admin)</h2>
        {!disponible ? (
          <Aviso nivel="atencion">Hay que aplicar la migración <code>2026-11-22_editor_tarjetas.sql</code> para registrar fuentes desde aquí.</Aviso>
        ) : (
          <FormAccion accion={guardarFuente} boton="Registrar fuente" className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <label className="block text-sm">Institución <input name="institucion" required placeholder="VIDECI" className={CLASES_CONTROL} /></label>
              <label className="block text-sm">Año <input name="anio" type="number" required min={1990} max={2100} className={CLASES_CONTROL} /></label>
            </div>
            <label className="block text-sm">Título del documento <input name="titulo" required className={CLASES_CONTROL} /></label>
            <label className="block text-sm">Enlace al original (https://…) <input name="url" type="url" required className={CLASES_CONTROL} /></label>
            <label className="block text-sm">Cómo se cita en las tarjetas
              <input name="clave" required placeholder="VIDECI, Guía de preparación ante nevadas" className={CLASES_CONTROL} />
            </label>
            <label className="block text-sm">Nota (opcional) <input name="nota" className={CLASES_CONTROL} /></label>
          </FormAccion>
        )}
      </section>
    </div>
  );
}
