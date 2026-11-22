import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { alertaActiva, resumenCiclo } from "@/lib/datos-publicos";
import { comunidadesVisibles } from "@/lib/visibilidad";
import { Ciclo } from "@/components/portada/Ciclo";
import { ComoSeCalcula } from "@/components/portada/ComoSeCalcula";
import { hoyBolivia, periodo } from "@/components/ui/formato";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description: "Cómo llegan los avisos del Senamhi a las comunidades, cómo se reciben sus reportes y cómo se registran las entregas.",
};

export default function ComoFunciona() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:py-8">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Cómo funciona</h1>
        <p className="text-lg text-tinta-2">
          PACHA trabaja por WhatsApp y Telegram, sin instalar nada. Las familias reciben los avisos y responden con un audio. El municipio usa esa
          información para decidir a quién atender primero.
        </p>
      </header>

      <Suspense fallback={<div className="h-64 rounded-xl border border-borde bg-superficie-2" role="status" aria-label="Cargando" />}>
        <Pasos />
      </Suspense>

      <section aria-labelledby="datos-titulo" className="max-w-3xl space-y-2">
        <h2 id="datos-titulo" className="text-2xl font-semibold">Datos y privacidad</h2>
        <ul className="list-disc space-y-1 pl-5 text-tinta">
          <li>Los avisos son del Senamhi. PACHA no hace pronósticos.</li>
          <li>Cada alerta la revisa una persona del municipio antes de enviarse.</li>
          <li>Las recomendaciones vienen de documentos de FAO, Senamhi y otras instituciones. La lista está en <Link href="/fuentes" className="text-marca underline">Fuentes</Link>.</li>
          <li>En el sitio no se muestran nombres ni teléfonos. Los audios de las personas no son públicos.</li>
          <li>Los audios de PACHA usan voz sintética.</li>
        </ul>
      </section>

      <ComoSeCalcula />
    </main>
  );
}

async function Pasos() {
  await connection();
  const [a, cs, r] = await Promise.all([alertaActiva(), comunidadesVisibles(), resumenCiclo()]);
  const vigente = !!a && a.valid_to >= hoyBolivia();
  return (
    <Ciclo
      datos={{
        aviso: a ? { vigente, detalle: `${a.simulacro ? "Simulacro · " : ""}${a.hazard === "sequia" ? "Sequía" : a.hazard === "nevada" ? "Nevada" : "Helada"} · ${periodo(a.valid_from, a.valid_to)}` } : null,
        ...r,
        comunidadesConReporte: cs.filter((c) => c.prioridad.estado === "activa").length,
        ahora: new Date(),
      }}
    />
  );
}
