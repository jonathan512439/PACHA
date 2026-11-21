"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import type { ComunidadMapaPublico } from "@/lib/tipos-publicos";
import s from "./mapa.module.css";

const COLORES = {
  rojo: "#b94738",
  naranja: "#d27b32",
  amarillo: "#d1a42d",
  verde: "#54815b",
  gris: "#8c9690",
};

function popupComunidad(comunidad: ComunidadMapaPublico) {
  const contenedor = document.createElement("section");
  contenedor.className = "pacha-map-popup";

  const titulo = document.createElement("h3");
  titulo.textContent = comunidad.nombre;
  contenedor.append(titulo);

  const etiquetas = document.createElement("p");
  etiquetas.className = "pacha-map-tags";
  etiquetas.textContent = [
    comunidad.isExample ? "EJEMPLO" : "",
    comunidad.isTest ? "Comunidad de prueba" : "",
    comunidad.municipio,
  ]
    .filter(Boolean)
    .join(" · ");
  contenedor.append(etiquetas);

  if (comunidad.prioridad.estado === "sin_reportes") {
    const sinReportes = document.createElement("p");
    sinReportes.className = "pacha-map-no-reports";
    sinReportes.textContent = "Sin reportes activos · prioridad gris";
    contenedor.append(sinReportes);
  } else {
    const prioridad = document.createElement("p");
    prioridad.className = "pacha-map-score";
    prioridad.textContent = `Prioridad ${comunidad.prioridad.resultado.score} · ${comunidad.prioridad.urgencia}`;
    contenedor.append(prioridad);

    const detalle = document.createElement("ul");
    for (const criterio of comunidad.prioridad.resultado.desglose) {
      const item = document.createElement("li");
      item.textContent = `${criterio.criterio}: ${criterio.aporte} puntos${criterio.nota ? " · estimado" : ""}`;
      detalle.append(item);
    }
    contenedor.append(detalle);
  }

  const enlace = document.createElement("a");
  enlace.href = "#como-se-calcula";
  enlace.textContent = "¿Cómo se calcula?";
  contenedor.append(enlace);
  return contenedor;
}

function colorPrioridad(comunidad: ComunidadMapaPublico) {
  return comunidad.prioridad.estado === "sin_reportes"
    ? COLORES.gris
    : COLORES[comunidad.prioridad.urgencia];
}

export default function MapaLeaflet({
  comunidades,
}: {
  comunidades: ComunidadMapaPublico[];
}) {
  const elementoMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaMarcadores = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elementoMapa.current) return;
    const instancia = L.map(elementoMapa.current, {
      center: [-18.1812759, -67.4061409],
      zoom: 10,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(instancia);

    mapa.current = instancia;
    capaMarcadores.current = L.layerGroup().addTo(instancia);
    return () => {
      instancia.remove();
      mapa.current = null;
      capaMarcadores.current = null;
    };
  }, []);

  useEffect(() => {
    const capa = capaMarcadores.current;
    if (!capa) return;
    capa.clearLayers();
    for (const comunidad of comunidades) {
      L.circleMarker([comunidad.lat, comunidad.lon], {
        radius: comunidad.isTest ? 9 : 8,
        color: "#ffffff",
        weight: 2,
        fillColor: colorPrioridad(comunidad),
        fillOpacity: 0.95,
      })
        .bindPopup(popupComunidad(comunidad), { maxWidth: 320 })
        .addTo(capa);
    }
  }, [comunidades]);

  return (
    <div
      aria-label="Mapa de comunidades y su prioridad de atención en Toledo, Oruro"
      className={s.mapCanvas}
      ref={elementoMapa}
      role="application"
    />
  );
}
