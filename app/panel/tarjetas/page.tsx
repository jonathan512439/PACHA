import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Aviso, Boton } from "@/components/ui";
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

function FilaVersion({ v }: { v: Version }) {
  return (
    <li className="rounded-lg border border-borde bg-superficie p-3 space-y-1">
      <p className="font-semibold">
        <Link href={`/panel/tarjetas/version/${v.id}`} className="underline">{v.contenido.title}</Link>{" "}
        <span className="text-sm font-normal text-tinta-2">({v.lesson_id})</span>
      </p>
      <p className="text-sm text-tinta-2">Motivo: {v.motivo} · redactó {v.created_by} · {fecha(v.created_at)}</p>
      {v.observacion && <p className="text-sm text-roja-tinta">Observación: {v.observacion}</p>}
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Tarjetas «qué hacer»</h1>
        <div className="ml-auto flex gap-2">
          <Boton href="/panel/tarjetas/editar" tamano="sm">Nueva tarjeta</Boton>
          <Boton href="/panel/fuentes" variante="secundario" tamano="sm">Fuentes</Boton>
        </div>
      </div>
      <p className="text-tinta-2">
        Cada cambio se guarda como una <strong>versión en borrador</strong>. Otra persona la coteja con la página de la fuente y recién
        entonces se publica. Mientras tanto se sigue enviando la versión vigente. Quien redacta no puede verificar.
      </p>

      {!disponible && (
        <Aviso nivel="atencion" titulo="Falta activar el editor">
          Hay que aplicar la migración <code>contratos/migraciones/2026-11-22_editor_tarjetas.sql</code> en Supabase. Las tarjetas
          publicadas siguen funcionando igual.
        </Aviso>
      )}

      {disponible && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Por verificar ({porVerificar.length})</h2>
          {porVerificar.length === 0 ? <p className="text-tinta-2">No hay versiones esperando verificación.</p> : (
            <ul className="space-y-2">{porVerificar.map((v) => <FilaVersion key={v.id} v={v} />)}</ul>
          )}
        </section>
      )}

      {disponible && devueltas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Devueltas para corregir</h2>
          <ul className="space-y-2">{devueltas.map((v) => <FilaVersion key={v.id} v={v} />)}</ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Todas las tarjetas ({tarjetas.length})</h2>
        <ul className="space-y-2">
          {tarjetas.map((t) => (
            <li key={t.id} className="rounded-lg border border-borde bg-superficie p-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.title} <span className="text-sm font-normal text-tinta-2">({t.id})</span></p>
                  <p className="text-sm text-tinta-2">
                    {etiquetaEstadoTarjeta(t)}{t.verified_by ? ` · verificó ${t.verified_by}` : ""} · {t.steps.length} pasos · {t.author}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Boton href={`/panel/tarjetas/editar?id=${t.id}`} variante="secundario" tamano="sm">Editar</Boton>
                  <Boton href={`/tarjetas/${t.id}`} variante="fantasma" tamano="sm">Ver</Boton>
                </div>
              </div>
              {disponible && t.status !== "borrador" && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-tinta-2">Retirar (solo admin)</summary>
                  <FormAccion accion={retirar.bind(null, t.id)} boton="Retirar tarjeta" className="mt-2">
                    <label className="block">
                      Motivo del retiro
                      <input name="motivo" required minLength={5} className="mt-1 block w-full rounded-lg border border-borde-fuerte px-3 py-2" />
                    </label>
                  </FormAccion>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
