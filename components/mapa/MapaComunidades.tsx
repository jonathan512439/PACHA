"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as MapaLeaflet, LayerGroup } from "leaflet";
import type { PrioridadComunidad } from "@/contratos/prioridad";
import { COLOR_URGENCIA, NOMBRE_URGENCIA, urgenciaDe } from "./colores";

export type PuntoMapa = {
  id: string; name: string; lat: number; lon: number; families: number; is_example: boolean; is_test: boolean; prioridad: PrioridadComunidad;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function popup(c: PuntoMapa): string {
  const u = urgenciaDe(c.prioridad);
  const cab = `<strong>${esc(c.name)}</strong>${c.is_example ? ' <span style="font-size:10px;background:#fef3c7;padding:1px 4px;border-radius:3px">EJEMPLO</span>' : ""}`;
  if (c.prioridad.estado !== "activa") return `${cab}<br>${NOMBRE_URGENCIA.gris}<br><small>${c.families} familias</small>`;
  const r = c.prioridad.resultado;
  const filas = r.desglose.map((d) => `<li>${esc(d.criterio)}: <b>${d.aporte}</b>${d.nota ? ` <i>(${esc(d.nota)})</i>` : ""}</li>`).join("");
  return `${cab}<br>Prioridad <b>${r.score}</b> · <span style="color:${COLOR_URGENCIA[u]}">${NOMBRE_URGENCIA[u]}</span><ul style="margin:4px 0 0 14px;padding:0">${filas}</ul>`;
}

/**
 * Mapa con Leaflet (sin react-leaflet): un círculo por comunidad, del color de su prioridad.
 * Se crea una sola vez; cuando cambian los datos (refresco automático) solo se redibujan los círculos.
 */
export default function MapaComunidades({ puntos }: { puntos: PuntoMapa[] }) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const capa = useRef<LayerGroup | null>(null);
  const ajustado = useRef(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelado || !div.current) return;
      if (!mapa.current) {
        mapa.current = L.map(div.current, { scrollWheelZoom: false }).setView([-18.19, -67.42], 10);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapa.current);
        capa.current = L.layerGroup().addTo(mapa.current);
      }
      capa.current!.clearLayers();
      for (const c of puntos) {
        const color = COLOR_URGENCIA[urgenciaDe(c.prioridad)];
        L.circleMarker([c.lat, c.lon], {
          radius: 8 + Math.min(c.families, 80) / 8, color: "#1c1917", weight: 1.5, fillColor: color, fillOpacity: 0.85,
        }).bindPopup(popup(c)).bindTooltip(c.name, { direction: "top" }).addTo(capa.current!);
      }
      if (!ajustado.current && puntos.length) {
        mapa.current.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lon] as [number, number])).pad(0.25));
        ajustado.current = true;
      }
    })();
    return () => { cancelado = true; };
  }, [puntos]);

  useEffect(() => () => { mapa.current?.remove(); mapa.current = null; }, []);

  return <div ref={div} role="region" aria-label="Mapa de comunidades por prioridad" className="h-[420px] w-full rounded-lg border border-stone-300 z-0" />;
}
