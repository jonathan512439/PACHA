"use client";

import dynamic from "next/dynamic";
import type { ComunidadMapaPublico } from "@/lib/tipos-publicos";
import s from "./mapa.module.css";

const MapaLeaflet = dynamic(() => import("./MapaLeaflet"), {
  ssr: false,
  loading: () => <div className={s.mapLoading}>Cargando mapa…</div>,
});

export function MapaDinamico({ comunidades }: { comunidades: ComunidadMapaPublico[] }) {
  return <MapaLeaflet comunidades={comunidades} />;
}
