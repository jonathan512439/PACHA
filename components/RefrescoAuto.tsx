"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Vuelve a pedir los datos del servidor cada N segundos (el mapa cambia de color sin recargar la página). */
export default function RefrescoAuto({ segundos = 15 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
