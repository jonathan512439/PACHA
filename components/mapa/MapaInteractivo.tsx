"use client";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2, OctagonAlert, TriangleAlert, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CircleMarker, LayerGroup, Map as MapaLeaflet } from "leaflet";
import { Insignia } from "@/components/ui/Insignia";
import { cx } from "@/components/ui/cx";
import { COLOR_NIVEL, COLORES } from "@/components/ui/tokens";
import { textoContador, textoEntrega, textoRespuesta } from "@/lib/visibilidad-calculo";
import type { AvisoMapa, NivelMapa, PuntoMapaVivo } from "./tipos";

const NIVELES: { id: NivelMapa; texto: string; umbral: string }[] = [
  { id: "rojo", texto: "Muy alta", umbral: "70 o más" },
  { id: "naranja", texto: "Alta", umbral: "50 a 69" },
  { id: "amarillo", texto: "Media", umbral: "30 a 49" },
  { id: "verde", texto: "Baja", umbral: "menos de 30" },
  { id: "gris", texto: "Sin reportes", umbral: "" },
];
const PROBLEMAS = [
  { id: "todos", texto: "Todos" },
  { id: "agua", texto: "Agua" },
  { id: "forraje", texto: "Forraje" },
  { id: "dano", texto: "Daños" },
] as const;
type FiltroProblema = (typeof PROBLEMAS)[number]["id"];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fecha = (d: string) =>
  new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));
const textoNivel = (n: NivelMapa) => NIVELES.find((x) => x.id === n)!.texto;

/** Resumen de una línea: "6 días sin agua · 40 familias · sin entrega todavía". */
function resumen(p: PuntoMapaVivo): string {
  const partes = [p.sinAgua && textoContador(p.sinAgua), p.sinForraje && textoContador(p.sinForraje), `${p.families} familias`];
  if (p.sinEntrega) partes.push("sin entrega todavía");
  else if ((p.sinAgua || p.sinForraje) && p.ultimaEntrega && p.ultimaEntrega.confirmed_by_community !== true)
    partes.push(p.ultimaEntrega.confirmed_by_community === false ? "la comunidad dice que la entrega no llegó" : "entrega registrada, falta que la comunidad confirme");
  return partes.filter(Boolean).join(" · ");
}

function popup(p: PuntoMapaVivo): string {
  const ej = p.is_example ? ` <span style="font-size:11px;font-weight:600;background:${COLORES["ocre-suave"]};color:${COLORES["ocre-tinta"]};padding:1px 5px;border-radius:4px">EJEMPLO</span>` : "";
  const prioridad = p.score !== null ? `Prioridad <b>${String(p.score).replace(".", ",")}</b> · ${textoNivel(p.nivel)}` : "Sin reportes activos";
  return (
    `<div style="font:14px/1.4 var(--font-inter),system-ui,sans-serif;color:${COLORES.tinta}">` +
    `<strong style="font-size:15px">${esc(p.name)}</strong>${ej}<br>${prioridad}<br>${esc(resumen(p))}<br>` +
    `<a href="/comunidad/${p.id}" style="color:${COLORES.marca};font-weight:600">Ver ficha pública</a></div>`
  );
}

/** "Actualizado hace 12 s": cuenta en el navegador desde la hora de los datos del servidor. */
function HaceCuanto({ desde }: { desde: string }) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = ahora === null ? 0 : Math.max(0, Math.round((ahora - new Date(desde).getTime()) / 1000));
  return (
    <span className="cifras" aria-live="off">
      Actualizado {ahora === null || s < 2 ? "recién" : s < 60 ? `hace ${s} s` : `hace ${Math.floor(s / 60)} min`}
    </span>
  );
}

/**
 * Mapa de prioridad con lista sincronizada (la lista es la alternativa accesible al mapa).
 * Filtros por nivel, por problema y "sin entrega"; ficha al tocar una comunidad; pantalla completa.
 * Base: OpenStreetMap en gris suave, para que resalten los colores de los niveles.
 */
export default function MapaInteractivo({ puntos, aviso, actualizado }: { puntos: PuntoMapaVivo[]; aviso: AvisoMapa; actualizado: string }) {
  const [niveles, setNiveles] = useState<Set<NivelMapa>>(() => new Set(NIVELES.map((n) => n.id)));
  const [problema, setProblema] = useState<FiltroProblema>("todos");
  const [soloSinEntrega, setSoloSinEntrega] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [completa, setCompleta] = useState(false);

  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const capa = useRef<LayerGroup | null>(null);
  const marcadores = useRef(new Map<string, CircleMarker>());
  const ajustado = useRef(false);

  const visibles = useMemo(
    () =>
      puntos.filter(
        (p) =>
          niveles.has(p.nivel) &&
          (problema === "todos" || p.problemas.includes(problema)) &&
          (!soloSinEntrega || p.sinEntrega),
      ),
    [puntos, niveles, problema, soloSinEntrega],
  );

  // Crea el mapa una vez y redibuja los marcadores cuando cambian los datos o los filtros.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelado || !div.current) return;
      if (!mapa.current) {
        mapa.current = L.map(div.current, { scrollWheelZoom: false, zoomControl: false }).setView([-18.19, -67.42], 10);
        L.control.zoom({ position: "bottomright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(mapa.current);
        // CARTO Positron ahora exige clave (devuelve "API KEY REQUIRED"): OSM con un filtro gris suave (.mapa-base).
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          className: "mapa-base",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
        }).addTo(mapa.current);
        capa.current = L.layerGroup().addTo(mapa.current);
      }
      capa.current!.clearLayers();
      marcadores.current.clear();
      for (const p of visibles) {
        const rojo = p.nivel === "rojo";
        const m = L.circleMarker([p.lat, p.lon], {
          radius: 8 + Math.min(p.families, 100) / 8,
          color: rojo ? COLOR_NIVEL.rojo : COLORES.tinta,
          weight: rojo ? 2 : 1.5,
          fillColor: COLOR_NIVEL[p.nivel],
          fillOpacity: 0.88,
          className: rojo ? "marcador-pulso" : undefined,
        })
          .bindPopup(popup(p))
          .bindTooltip(p.name, { direction: "top" })
          .on("click", () => setSeleccion(p.id))
          .addTo(capa.current!);
        marcadores.current.set(p.id, m);
      }
      if (!ajustado.current && visibles.length) {
        mapa.current.fitBounds(L.latLngBounds(visibles.map((p) => [p.lat, p.lon] as [number, number])).pad(0.25));
        ajustado.current = true;
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [visibles]);

  // Al elegir una comunidad en la lista, el mapa vuela hasta ella y abre su ficha corta.
  useEffect(() => {
    if (!seleccion || !mapa.current) return;
    const m = marcadores.current.get(seleccion);
    if (!m) return;
    mapa.current.flyTo(m.getLatLng(), Math.max(mapa.current.getZoom(), 11), { duration: 0.6 });
    m.openPopup();
    document.getElementById(`comunidad-${seleccion}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [seleccion]);

  // Pantalla completa: recalcula el tamaño y se cierra con Escape.
  useEffect(() => {
    const t = setTimeout(() => mapa.current?.invalidateSize({ pan: false }), 150);
    if (!completa) return () => clearTimeout(t);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setCompleta(false);
    window.addEventListener("keydown", tecla);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", tecla);
    };
  }, [completa]);

  useEffect(
    () => () => {
      mapa.current?.remove();
      mapa.current = null;
    },
    [],
  );

  const alternar = (n: NivelMapa) =>
    setNiveles((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });

  const IconoAviso = aviso?.nivel === "roja" ? OctagonAlert : aviso?.nivel === "naranja" ? TriangleAlert : Info;

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3 text-sm shadow-suave lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6">
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="mr-1 inline font-semibold text-tinta">Nivel:</legend>
          {NIVELES.map((n) => (
            <button
              key={n.id}
              type="button"
              aria-pressed={niveles.has(n.id)}
              onClick={() => alternar(n.id)}
              className={cx(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3",
                niveles.has(n.id) ? "border-tinta bg-superficie text-tinta" : "border-borde bg-superficie-2 text-tinta-2 line-through",
              )}
            >
              <span className="size-3 rounded-full ring-1 ring-tinta/40" style={{ background: COLOR_NIVEL[n.id] }} aria-hidden="true" />
              {n.texto}
            </button>
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="mr-1 inline font-semibold text-tinta">Problema:</legend>
          {PROBLEMAS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={problema === p.id}
              onClick={() => setProblema(p.id)}
              className={cx(
                "min-h-10 rounded-full border px-3",
                problema === p.id ? "border-marca bg-marca text-white" : "border-borde-fuerte bg-superficie text-tinta hover:bg-marca-suave",
              )}
            >
              {p.texto}
            </button>
          ))}
        </fieldset>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 font-medium text-tinta">
          <input type="checkbox" checked={soloSinEntrega} onChange={(e) => setSoloSinEntrega(e.target.checked)} className="size-4 accent-marca" />
          Solo sin entrega todavía
        </label>
      </div>

      <p className="flex flex-wrap justify-between gap-2 text-sm text-tinta-2" role="status">
        <span>
          Mostrando <b className="cifras text-tinta">{visibles.length}</b> de {puntos.length} comunidades
        </span>
        <HaceCuanto desde={actualizado} />
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* Mapa */}
        <div className={cx(completa ? "fixed inset-0 z-[2000] flex flex-col bg-fondo p-2" : "relative")}>
          <div className={cx("relative", completa ? "h-full" : "h-[360px] sm:h-[480px]")}>
            {aviso && (
              <div
                className={cx(
                  "absolute left-2 right-14 top-2 z-[1000] flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-suave",
                  aviso.nivel === "roja" ? "bg-roja text-white" : aviso.nivel === "naranja" ? "bg-naranja text-white" : "bg-marca-suave text-tinta",
                )}
              >
                <IconoAviso aria-hidden="true" className={cx("size-4 shrink-0", aviso.nivel === "roja" && "animate-pulso")} />
                <span className="truncate">
                  {aviso.nivel === "roja" ? "ALERTA ROJA · " : aviso.nivel === "naranja" ? "ALERTA NARANJA · " : "Aviso · "}
                  {aviso.amenaza} · {aviso.zona} · {aviso.fechas}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCompleta((c) => !c)}
              className="absolute right-2 top-2 z-[1000] inline-flex size-10 items-center justify-center rounded-lg border border-borde-fuerte bg-superficie text-tinta shadow-suave hover:bg-marca-suave"
              aria-label={completa ? "Salir de pantalla completa" : "Ver el mapa en pantalla completa"}
              title={completa ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
            >
              {completa ? <Minimize2 className="size-5" aria-hidden="true" /> : <Maximize2 className="size-5" aria-hidden="true" />}
            </button>
            <div
              ref={div}
              role="region"
              aria-label="Mapa de comunidades por prioridad. La lista tiene la misma información."
              // className fijo: Leaflet le agrega sus clases (leaflet-container…) y React no debe pisarlas al re-renderizar.
              className="z-0 h-full w-full rounded-xl border border-borde"
            />
            <ul
              aria-label="Leyenda"
              className="pointer-events-none absolute bottom-7 left-2 z-[1000] space-y-0.5 rounded-lg border border-borde bg-superficie/95 px-2.5 py-2 text-xs text-tinta shadow-suave"
            >
              {NIVELES.map((n) => (
                <li key={n.id} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full ring-1 ring-tinta/40" style={{ background: COLOR_NIVEL[n.id] }} aria-hidden="true" />
                  {n.texto}
                  {n.umbral && <span className="text-tinta-2">({n.umbral})</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Lista sincronizada */}
        <section aria-labelledby="lista-titulo" className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-suave lg:max-h-[480px] lg:overflow-y-auto">
          <h3 id="lista-titulo" className="sticky top-0 z-10 border-b border-borde bg-superficie px-4 py-3 text-lg font-semibold">
            Comunidades por prioridad
          </h3>
          {visibles.length === 0 ? (
            <p className="px-4 py-6 text-sm text-tinta-2">Ninguna comunidad cumple estos filtros.</p>
          ) : (
            <ol className="divide-y divide-borde">
              {visibles.map((p) => {
                const abierta = seleccion === p.id;
                return (
                  <li key={p.id} id={`comunidad-${p.id}`} className={cx(abierta && "bg-marca-suave")}>
                    <button
                      type="button"
                      aria-expanded={abierta}
                      aria-controls={`ficha-${p.id}`}
                      onClick={() => setSeleccion(abierta ? null : p.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-superficie-2"
                    >
                      <span className="cifras w-5 shrink-0 pt-0.5 text-right text-sm text-tinta-2">{puntos.indexOf(p) + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">{p.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Insignia tipo={`nivel-${p.nivel}`} />
                          {p.is_example && <Insignia tipo="ejemplo" />}
                        </span>
                        <span className="mt-1 block text-sm text-tinta-2">{resumen(p)}</span>
                      </span>
                      <span className="cifras shrink-0 text-right">
                        {p.score !== null ? (
                          <>
                            <span className="block font-titulo text-xl font-semibold leading-none">{String(p.score).replace(".", ",")}</span>
                            <span className="text-xs text-tinta-2">de 100</span>
                          </>
                        ) : (
                          <span className="text-sm text-tinta-2">—</span>
                        )}
                      </span>
                    </button>
                    {abierta && <Ficha p={p} />}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/** Ficha corta de la comunidad (debajo de su fila en la lista). */
function Ficha({ p }: { p: PuntoMapaVivo }) {
  const e = p.ultimaEntrega;
  return (
    <div id={`ficha-${p.id}`} className="space-y-3 px-4 pb-4 pl-12 text-sm text-tinta">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-tinta-2">Familias</dt>
        <dd className="cifras font-medium">{p.families}</dd>
        {p.sinAgua && (
          <>
            <dt className="text-tinta-2">Agua</dt>
            <dd className="font-semibold text-roja-tinta">{textoContador(p.sinAgua)}</dd>
          </>
        )}
        {p.sinForraje && (
          <>
            <dt className="text-tinta-2">Forraje</dt>
            <dd className="font-semibold text-roja-tinta">{textoContador(p.sinForraje)}</dd>
          </>
        )}
        {p.factor && (
          <>
            <dt className="text-tinta-2">Problema</dt>
            <dd>{p.factor}</dd>
          </>
        )}
        <dt className="text-tinta-2">Última entrega</dt>
        <dd>
          {e ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {textoEntrega(e)} · {fecha(e.delivered_at)}
              <Insignia tipo={e.confirmed_by_community === true ? "llego" : e.confirmed_by_community === false ? "no-llego" : "sin-respuesta"}>
                {textoRespuesta(e.confirmed_by_community)}
              </Insignia>
            </span>
          ) : (
            "Ninguna todavía"
          )}
        </dd>
      </dl>
      {p.score !== null && (
        <div>
          <p className="font-semibold">Por qué tiene {String(p.score).replace(".", ",")} puntos</p>
          <ul className="mt-1 space-y-0.5 text-tinta-2">
            {p.desglose.map((d) => (
              <li key={d.criterio} className="flex gap-2">
                <span className="flex-1">
                  {d.criterio}
                  {d.nota && <span className="italic"> ({d.nota})</span>}
                </span>
                <b className="cifras text-tinta">{String(d.aporte).replace(".", ",")}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link href={`/comunidad/${p.id}`} className="inline-block font-semibold text-marca underline hover:no-underline">
        Ver ficha pública de {p.name}
      </Link>
    </div>
  );
}
