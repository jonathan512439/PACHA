import { cache, Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { alertaActiva } from "@/lib/datos-publicos";
import { comunidadesVisibles } from "@/lib/visibilidad";
import { etiquetaFactor } from "@/lib/problemas-agrupar";
import MapaInteractivo from "@/components/mapa/MapaInteractivo";
import type { AvisoMapa, PuntoMapaVivo } from "@/components/mapa/tipos";
import { urgenciaDe } from "@/components/mapa/colores";
import RefrescoAuto from "@/components/RefrescoAuto";
import { BandaAviso, nivelBanda } from "@/components/portada/BandaAviso";
import { ResumenComunidades } from "@/components/portada/SinAgua";
import { hoyBolivia, periodo } from "@/components/ui/formato";

// Una sola consulta por petición aunque la pidan la banda, el mapa y el resumen.
const alerta = cache(alertaActiva);
const comunidades = cache(() => comunidadesVisibles());

const Cargando = ({ alto, texto }: { alto: string; texto: string }) => (
  <div className={`${alto} rounded-xl border border-borde bg-superficie-2`} role="status" aria-label={texto} />
);

export default function Inicio() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:py-8">
      <section aria-labelledby="titulo-portada" className="max-w-3xl space-y-2">
        <h1 id="titulo-portada" className="text-3xl font-semibold sm:text-4xl">Comunidades del Altiplano de Oruro</h1>
        <p className="text-lg text-tinta-2">
          PACHA envía los avisos del Senamhi a las comunidades y recibe sus reportes cuando falta agua o forraje. Este mapa muestra qué
          comunidades necesitan atención y qué entregas se hicieron.{" "}
          <Link href="/como-funciona" className="text-marca underline">Cómo funciona</Link>
        </p>
      </section>

      <div id="aviso" className="scroll-mt-4">
        <Suspense fallback={<Cargando alto="h-24" texto="Cargando el aviso" />}>
          <Aviso />
        </Suspense>
      </div>

      <section id="mapa" aria-labelledby="mapa-titulo" className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="mapa-titulo" className="text-2xl font-semibold">Prioridad de atención</h2>
          <Link href="/como-funciona#como-se-calcula" className="inline-flex min-h-10 items-center text-sm text-marca underline">Cómo se calcula</Link>
        </div>
        <Suspense fallback={<Cargando alto="h-[480px]" texto="Cargando el mapa" />}>
          <MapaYRanking />
        </Suspense>
      </section>

      <Suspense fallback={<Cargando alto="h-40" texto="Cargando el resumen" />}>
        <Resumen />
      </Suspense>
    </main>
  );
}

async function Aviso() {
  await connection();
  return <BandaAviso alerta={await alerta()} hoy={hoyBolivia()} />;
}

async function Resumen() {
  await connection();
  return <ResumenComunidades comunidades={await comunidades()} />;
}

const AMENAZA: Record<string, string> = { helada: "Helada", sequia: "Sequía", nevada: "Nevada" };

async function MapaYRanking() {
  await connection();
  const [cs, a] = await Promise.all([comunidades(), alerta()]);
  const puntos: PuntoMapaVivo[] = cs.map((c) => {
    const activa = c.prioridad.estado === "activa" ? c.prioridad.resultado : null;
    const e = c.vis.ultimaEntrega;
    return {
      id: c.id, name: c.name, lat: c.lat, lon: c.lon, families: c.families, is_example: c.is_example, is_test: c.is_test,
      nivel: urgenciaDe(c.prioridad), score: activa?.score ?? null, desglose: activa?.desglose ?? [],
      problemas: c.vis.problemas, factor: c.vis.factor ? etiquetaFactor(c.vis.factor) : null,
      sinAgua: c.vis.sinAgua, sinForraje: c.vis.sinForraje, sinEntrega: c.vis.sinEntrega,
      ultimaEntrega: e && { kind: e.kind, quantity: e.quantity, unit: e.unit, delivered_at: e.delivered_at, confirmed_by_community: e.confirmed_by_community },
    };
  });
  const aviso: AvisoMapa =
    a && a.valid_to >= hoyBolivia()
      ? { nivel: nivelBanda(a), amenaza: AMENAZA[a.hazard] ?? a.hazard, zona: a.zona ?? "Altiplano", fechas: periodo(a.valid_from, a.valid_to) }
      : null;
  return (
    <>
      <RefrescoAuto segundos={15} />
      <MapaInteractivo puntos={puntos} aviso={aviso} actualizado={new Date().toISOString()} />
    </>
  );
}
