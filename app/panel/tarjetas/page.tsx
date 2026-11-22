import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Aviso, Boton, CLASES_CONTROL, Insignia } from "@/components/ui";
import { BookOpen, ChevronDown, ExternalLink, FilePen, Pencil, Plus, Trash2 } from "lucide-react";
import { FormAccion } from "@/components/panel/Acciones";
import { editorDisponible, listarVersiones, type Version } from "@/lib/editor-tarjetas";
import { listarTarjetas } from "@/lib/tarjetas";
import { etiquetaEstadoTarjeta } from "@/contratos/tipos";
import { retirar } from "./acciones";

export const metadata: Metadata = { title: "Tarjetas" };

const fecha = (iso: string) => new Date(iso).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "short" });

export default function PaginaTarjetas() {
  return (
    <Suspense fallback={<p className="text-tinta-2">Cargando tarjetas…</p>}>
      <Contenido />
    </Suspense>
  );
}

const AMENAZA = { helada: { texto: "Helada" }, sequia: { texto: "Sequía" }, nevada: { texto: "Nevada" } } as const;
const FASE: Record<string, string> = { antes_familia: "Antes · familia", antes_animales: "Antes · animales", durante: "Durante", despues: "Después" };

function FilaVersion({ v, devuelta }: { v: Version; devuelta?: boolean }) {
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3">
      <FilePen aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${devuelta ? "text-roja" : "text-ocre"}`} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold leading-snug">
          {v.contenido.title} <span className="font-sans text-xs font-normal text-tinta-2">{v.lesson_id}</span>
        </p>
        <p className="text-sm text-tinta-2">{v.motivo}</p>
        <p className="cifras text-xs text-tinta-2">Redactó {v.created_by} · {fecha(v.created_at)}</p>
        {v.observacion && <p className="rounded-md bg-roja-suave px-2.5 py-1.5 text-sm text-roja-tinta">Observación: {v.observacion}</p>}
      </div>
      <Boton href={`/panel/tarjetas/version/${v.id}`} tamano="sm" variante={devuelta ? "secundario" : "primario"}>
        {devuelta ? "Ver y corregir" : "Verificar"}
      </Boton>
    </li>
  );
}

async function Contenido() {
  await connection();
  const [disponible, tarjetas] = await Promise.all([editorDisponible(), listarTarjetas()]);
  const [porVerificar, devueltas] = disponible
    ? await Promise.all([listarVersiones(["borrador"]), listarVersiones(["devuelta"])])
    : [[], []];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">Tarjetas «qué hacer»</h1>
          <p className="text-sm text-tinta-2">
            {tarjetas.length} tarjetas · {porVerificar.length} {porVerificar.length === 1 ? "cambio" : "cambios"} por verificar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton href="/panel/tarjetas/editar" tamano="sm" icono={<Plus className="size-4" />}>Nueva tarjeta</Boton>
          <Boton href="/panel/fuentes" variante="secundario" tamano="sm" icono={<BookOpen className="size-4" />}>Fuentes</Boton>
        </div>
      </header>

      <Aviso nivel="info" titulo="Cómo se publica un cambio">
        Cada cambio se guarda como una <strong>versión en borrador</strong>. Otra persona la coteja con la página de la fuente y recién entonces
        se publica. Mientras tanto se sigue enviando la versión vigente. Quien redacta no puede verificar.
      </Aviso>

      {!disponible && (
        <Aviso nivel="atencion" titulo="Falta activar el editor">
          Hay que aplicar la migración <code>contratos/migraciones/2026-11-22_editor_tarjetas.sql</code> en Supabase. Las tarjetas
          publicadas siguen funcionando igual.
        </Aviso>
      )}

      {disponible && (
        <section aria-labelledby="t-verificar" className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-suave">
          <h2 id="t-verificar" className="flex items-center gap-2 border-b border-borde px-4 py-3 text-lg font-semibold">
            Por verificar
            <span className="cifras rounded-full bg-ocre-suave px-2 font-sans text-xs font-semibold text-ocre-tinta">{porVerificar.length}</span>
          </h2>
          {porVerificar.length === 0 ? (
            <p className="px-4 py-3 text-sm text-tinta-2">No hay versiones esperando verificación.</p>
          ) : (
            <ul className="divide-y divide-borde">{porVerificar.map((v) => <FilaVersion key={v.id} v={v} />)}</ul>
          )}
        </section>
      )}

      {disponible && devueltas.length > 0 && (
        <section aria-labelledby="t-devueltas" className="overflow-hidden rounded-xl border border-roja/40 bg-superficie shadow-suave">
          <h2 id="t-devueltas" className="flex items-center gap-2 border-b border-borde px-4 py-3 text-lg font-semibold">
            Devueltas para corregir
            <span className="cifras rounded-full bg-roja-suave px-2 font-sans text-xs font-semibold text-roja-tinta">{devueltas.length}</span>
          </h2>
          <ul className="divide-y divide-borde">{devueltas.map((v) => <FilaVersion key={v.id} v={v} devuelta />)}</ul>
        </section>
      )}

      <section aria-labelledby="t-todas" className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-suave">
        <h2 id="t-todas" className="flex items-center gap-2 border-b border-borde px-4 py-3 text-lg font-semibold">
          Todas las tarjetas
          <span className="cifras rounded-full bg-superficie-2 px-2 font-sans text-xs font-semibold text-tinta">{tarjetas.length}</span>
        </h2>
        <ul className="divide-y divide-borde">
          {tarjetas.map((t) => {
            const a = AMENAZA[t.hazard as keyof typeof AMENAZA] ?? AMENAZA.helada;
            return (
              <li key={t.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold leading-snug">{t.title}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-tinta-2">
                      <Insignia tipo={t.status === "borrador" ? "borrador" : t.status === "revisada" ? "revisada" : "verificada"}>{etiquetaEstadoTarjeta(t)}</Insignia>
                      <span>{a.texto} · {FASE[t.phase] ?? t.phase}</span>
                      <span>· {t.steps.length} pasos</span>
                      {t.verified_by && <span>· verificó {t.verified_by}</span>}
                    </p>
                    <p className="text-xs text-tinta-2">Fuente: {t.author} · <span className="font-mono">{t.id}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Boton href={`/panel/tarjetas/editar?id=${t.id}`} variante="secundario" tamano="sm" icono={<Pencil className="size-4" />}>Editar</Boton>
                    <Boton href={`/tarjetas/${t.id}`} variante="fantasma" tamano="sm" icono={<ExternalLink className="size-4" />}>Ver</Boton>
                  </div>
                </div>
                {disponible && t.status !== "borrador" && (
                  <details className="group mt-2 text-sm">
                    <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 font-semibold text-roja-tinta hover:bg-roja-suave [&::-webkit-details-marker]:hidden">
                      <Trash2 aria-hidden="true" className="size-4" />
                      Retirar (solo admin)
                      <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <FormAccion accion={retirar.bind(null, t.id)} boton="Retirar tarjeta" variante="peligro" className="mt-2 space-y-3 rounded-lg border border-roja/40 bg-roja-suave p-3">
                      <label className="block space-y-1.5 font-semibold text-tinta">
                        <span>Motivo del retiro</span>
                        <input name="motivo" required minLength={5} className={CLASES_CONTROL} />
                      </label>
                    </FormAccion>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
