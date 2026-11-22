import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CircleCheck, CircleX, ClipboardCheck, MessageCircle, Mic, Truck } from "lucide-react";
import { etiquetaFactor } from "@/lib/problemas-agrupar";
import { urlApp } from "@/lib/url";
import { fichaComunidad } from "@/lib/visibilidad";
import { lineaDeTiempo, textoCompartir, textoContador, textoEntrega, textoHoras, tiemposRespuesta, type Evento } from "@/lib/visibilidad-calculo";
import { urgenciaDe } from "@/components/mapa/colores";
import { Boton } from "@/components/ui/Boton";
import { Cifra } from "@/components/ui/Cifra";
import { Insignia } from "@/components/ui/Insignia";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Vacio } from "@/components/ui/Vacio";
import { fechaHora } from "@/components/ui/formato";

export const metadata: Metadata = {
  title: "Ficha de la comunidad",
  description: "Días sin agua, reportes y entregas confirmados por la comunidad. Sin datos personales.",
};

export default function PaginaComunidad({ params }: PageProps<"/comunidad/[id]">) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <nav>
        <Link href="/#mapa" className="inline-flex min-h-10 items-center text-marca underline hover:no-underline">← Volver al mapa</Link>
      </nav>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando la ficha" />}>
        {params.then(({ id }) => <Ficha id={id} />)}
      </Suspense>
    </main>
  );
}

const ICONO: Record<Evento["tipo"], typeof Mic> = { reporto: Mic, confirmo: ClipboardCheck, entrega: Truck, respuesta: CircleCheck };

async function Ficha({ id }: { id: string }) {
  await connection();
  const f = await fichaComunidad(id);
  if (!f) notFound();
  const { comunidad: c, puesto, total, reportes, entregas } = f;
  const ahora = new Date();
  const activa = c.prioridad.estado === "activa" ? c.prioridad.resultado : null;
  const contadores = [c.vis.sinAgua, c.vis.sinForraje].filter((x) => x !== null);
  const eventos = lineaDeTiempo(reportes, entregas, etiquetaFactor);
  const tiempos = tiemposRespuesta(reportes, entregas);
  const url = `${urlApp()}/comunidad/${c.id}`;
  const compartir = textoCompartir({ nombre: c.name, ejemplo: c.is_example, vis: c.vis, url });

  return (
    <>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tipo={`nivel-${urgenciaDe(c.prioridad)}`} />
          {c.is_example && <Insignia tipo="ejemplo" />}
        </div>
        <h1 className="text-4xl font-semibold leading-tight">{c.name}</h1>
        <p className="text-tinta-2">
          {c.municipio} · <span className="cifras">{c.families}</span> familias · <span className="cifras">{c.animals}</span> animales
        </p>
      </header>

      <Tarjeta aria-label="Situación hoy">
        {contadores.length ? (
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            {contadores.map((k) => (
              <Cifra
                key={k.recurso}
                tamano="lg"
                tono="roja"
                valor={k.dias}
                etiqueta={textoContador(k)}
                detalle={`desde que reportó el ${fechaHora(k.desde)}${k.familias != null ? ` · ${k.familias} familias afectadas` : ""}`}
              />
            ))}
            <p className="text-sm font-semibold text-tinta">
              {c.vis.sinEntrega
                ? "Sin entrega todavía."
                : c.vis.ultimaEntrega?.confirmed_by_community === false
                  ? "La comunidad dice que la última entrega no llegó."
                  : "Hay una entrega registrada: falta que la comunidad confirme que llegó."}
            </p>
          </div>
        ) : (
          <p className="text-lg font-semibold">La comunidad no tiene falta de agua o forraje sin resolver.</p>
        )}
        <p className="mt-3 text-sm text-tinta-2">
          El número sube cada día hasta que la comunidad confirma que llegó la ayuda.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Boton
            href={`https://wa.me/?text=${encodeURIComponent(compartir)}`}
            target="_blank"
            rel="noopener noreferrer"
            icono={<MessageCircle className="size-5" />}
          >
            Compartir por WhatsApp
          </Boton>
          <p className="max-w-prose text-xs text-tinta-2">Se comparte: «{compartir}»</p>
        </div>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Tarjeta titulo="Línea de tiempo">
          {eventos.length ? (
            <ol className="relative space-y-4 border-l-2 border-borde pl-6">
              {eventos.map((e, i) => {
                const Icono = e.tipo === "respuesta" && e.llego === false ? CircleX : ICONO[e.tipo];
                return (
                  <li key={i} className="relative">
                    <span
                      className={
                        "absolute -left-[37px] flex size-8 items-center justify-center rounded-full border-2 bg-superficie " +
                        (e.tipo === "respuesta" ? (e.llego ? "border-verde text-verde" : "border-roja text-roja") : "border-marca text-marca")
                      }
                      aria-hidden="true"
                    >
                      <Icono className="size-4" />
                    </span>
                    <p className="cifras text-xs font-semibold text-tinta-2">{fechaHora(e.fecha)}</p>
                    <p className="text-sm text-tinta">{e.texto}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Vacio titulo="Todavía no hay reportes confirmados ni entregas." />
          )}
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Prioridad pública">
            {activa ? (
              <div className="space-y-3 text-sm">
                <Cifra valor={String(activa.score).replace(".", ",")} unidad="de 100" etiqueta={`Puesto ${puesto} de ${total} comunidades`} />
                <ul className="space-y-0.5 text-tinta-2">
                  {activa.desglose.map((d) => (
                    <li key={d.criterio} className="flex gap-2">
                      <span className="flex-1">{d.criterio}{d.nota && <span className="italic"> ({d.nota})</span>}</span>
                      <b className="cifras text-tinta">{String(d.aporte).replace(".", ",")}</b>
                    </li>
                  ))}
                </ul>
                <Link href="/#como-se-calcula" className="font-semibold text-marca underline">¿Cómo se calcula?</Link>
              </div>
            ) : (
              <p className="text-sm text-tinta-2">Sin reportes confirmados pendientes de atender.</p>
            )}
          </Tarjeta>

          <Tarjeta titulo="Tiempo de respuesta">
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
              <dt className="text-tinta-2">Del reporte a la entrega</dt>
              <dd className="cifras font-semibold">{tiempos.reporteAEntrega !== null ? textoHoras(tiempos.reporteAEntrega) : "—"}</dd>
              <dt className="text-tinta-2">De la entrega a la respuesta de la comunidad</dt>
              <dd className="cifras font-semibold">{tiempos.entregaARespuesta !== null ? textoHoras(tiempos.entregaARespuesta) : "—"}</dd>
            </dl>
            {c.vis.ultimaEntrega && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
                Última entrega: {textoEntrega(c.vis.ultimaEntrega)}
                <Insignia
                  tipo={c.vis.ultimaEntrega.confirmed_by_community === true ? "llego" : c.vis.ultimaEntrega.confirmed_by_community === false ? "no-llego" : "sin-respuesta"}
                />
              </p>
            )}
          </Tarjeta>
        </div>
      </div>

      <section aria-label="Fuentes de los datos" className="space-y-1 text-sm text-tinta-2">
        <p>
          <strong className="text-tinta">Fuentes:</strong> reportes que la comunidad hizo por voz y confirmó en el bot de PACHA; entregas registradas por la
          técnica del municipio, con foto, y la respuesta de la comunidad. Sin nombres ni teléfonos.
        </p>
        <p>Datos al {fechaHora(ahora)} (hora de Bolivia).{c.is_example && " Comunidad, reportes y entregas de EJEMPLO."}</p>
      </section>
    </>
  );
}
