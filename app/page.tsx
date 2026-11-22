import { cache, Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { rangoFechas } from "@/contratos/tipos";
import { alertaActiva, resumenCiclo } from "@/lib/datos-publicos";
import { comunidadesVisibles } from "@/lib/visibilidad";
import { etiquetaFactor } from "@/lib/problemas-agrupar";
import MapaInteractivo from "@/components/mapa/MapaInteractivo";
import type { AvisoMapa, PuntoMapaVivo } from "@/components/mapa/tipos";
import { urgenciaDe } from "@/components/mapa/colores";
import RefrescoAuto from "@/components/RefrescoAuto";
import { BandaAviso, nivelBanda } from "@/components/portada/BandaAviso";
import { Ciclo } from "@/components/portada/Ciclo";
import { ComoSeCalcula } from "@/components/portada/ComoSeCalcula";
import { Boton } from "@/components/ui/Boton";
import { hoyBolivia } from "@/components/ui/formato";
import { Horizonte } from "@/components/ui/Horizonte";

// Una sola consulta por petición aunque la pidan la banda, el ciclo y el mapa.
const alerta = cache(alertaActiva);
const comunidades = cache(() => comunidadesVisibles());

export default function Inicio() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:py-8">
      <div id="aviso" className="scroll-mt-4">
        <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando el aviso vigente" />}>
          <Aviso />
        </Suspense>
      </div>

      <section className="grid items-center gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10" aria-labelledby="titulo-portada">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-wider text-acento">Piloto · Altiplano de Oruro</p>
          <h1 id="titulo-portada" className="text-4xl font-semibold leading-tight sm:text-5xl">
            Del aviso oficial a la ayuda que se puede comprobar
          </h1>
          <p className="max-w-prose text-lg text-tinta-2">
            PACHA lleva el aviso del Senamhi a cada familia con qué hacer, recibe sus reportes por voz y muestra en público a quién atender
            primero y si la ayuda llegó.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Boton href="/probar" tamano="lg">Probar el bot</Boton>
            <Boton href="#mapa" variante="secundario" tamano="lg">Ver el mapa</Boton>
          </div>
        </div>
        <figure className="space-y-1.5">
          <Image
            src="/ilustraciones/portada.webp"
            alt=""
            width={1344}
            height={752}
            priority
            sizes="(min-width: 1024px) 540px, 100vw"
            className="w-full rounded-2xl border border-borde object-cover shadow-suave"
          />
          <figcaption className="text-xs text-tinta-2">Ilustración generada con IA.</figcaption>
        </figure>
      </section>

      <Horizonte className="text-acento" />

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando el ciclo" />}>
        <CicloVivo />
      </Suspense>

      <section id="mapa" aria-labelledby="mapa-titulo" className="scroll-mt-4 space-y-4">
        <div className="space-y-1">
          <h2 id="mapa-titulo" className="text-2xl font-semibold sm:text-3xl">Prioridad de atención por comunidad</h2>
          <p className="max-w-prose text-tinta-2">
            Cada reporte confirmado por la comunidad suma a una fórmula pública. El color indica a quién llevar primero cisternas o
            forraje. Se actualiza solo.
          </p>
        </div>
        <Suspense fallback={<div className="h-[480px] animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando el mapa" />}>
          <MapaYRanking />
        </Suspense>
      </section>

      <ComoSeCalcula />
    </main>
  );
}

async function Aviso() {
  await connection();
  return <BandaAviso alerta={await alerta()} hoy={hoyBolivia()} />;
}

async function CicloVivo() {
  await connection();
  const [a, cs, r] = await Promise.all([alerta(), comunidades(), resumenCiclo()]);
  const vigente = !!a && a.valid_to >= hoyBolivia();
  return (
    <Ciclo
      datos={{
        aviso: a ? { vigente, detalle: `${a.hazard === "sequia" ? "Sequía" : a.hazard === "nevada" ? "Nevada" : "Helada"} · ${rangoFechas(a.valid_from, a.valid_to)}` } : null,
        ...r,
        comunidadesConReporte: cs.filter((c) => c.prioridad.estado === "activa").length,
        ahora: new Date(),
      }}
    />
  );
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
      ? { nivel: nivelBanda(a.risk_level), amenaza: AMENAZA[a.hazard] ?? a.hazard, zona: a.zona ?? "Altiplano", fechas: rangoFechas(a.valid_from, a.valid_to) }
      : null;
  return (
    <>
      <RefrescoAuto segundos={15} />
      <MapaInteractivo puntos={puntos} aviso={aviso} actualizado={new Date().toISOString()} />
    </>
  );
}
