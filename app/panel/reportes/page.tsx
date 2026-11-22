import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { reportesPanel } from "@/lib/datos-publicos";
import { TarjetaReporte } from "@/components/panel/TarjetaReporte";
import RefrescoAuto from "@/components/RefrescoAuto";
import { cx } from "@/components/ui/cx";

export const metadata: Metadata = { title: "Reportes" };

type Grupo = { estado: string; titulo: string; corto: string; ayuda: string; borde: string; punto: string };
const GRUPOS: Grupo[] = [
  { estado: "revisar", titulo: "Por revisar", corto: "Por revisar", ayuda: "El bot no entendió bien (confianza baja): escucha el audio y confirma o descarta.", borde: "border-l-ocre", punto: "bg-ocre" },
  { estado: "confirmado", titulo: "Confirmados · cuentan para la prioridad", corto: "Confirmados", ayuda: "Registra la entrega cuando se atienda: el bot le pregunta a la comunidad si llegó.", borde: "border-l-marca", punto: "bg-marca" },
  { estado: "por_confirmar", titulo: "Esperando que la persona confirme", corto: "Esperando", ayuda: "El bot preguntó «¿Entendí bien?» y aún no respondieron.", borde: "border-l-borde-fuerte", punto: "bg-gris" },
  { estado: "atendido", titulo: "Atendidos", corto: "Atendidos", ayuda: "Ya tienen una entrega registrada.", borde: "border-l-verde", punto: "bg-verde" },
  { estado: "descartado", titulo: "Descartados", corto: "Descartados", ayuda: "", borde: "border-l-borde", punto: "bg-borde-fuerte" },
];
export default function Reportes() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando reportes" />}>
      <Lista />
    </Suspense>
  );
}

async function Lista() {
  await connection();
  const reportes = await reportesPanel();
  const visibles = GRUPOS.map((g) => ({ g, lista: reportes.filter((r) => r.status === g.estado) })).filter(
    ({ g, lista }) => lista.length > 0 || g.estado === "revisar" || g.estado === "confirmado",
  );
  return (
    <div className="space-y-6">
      <RefrescoAuto segundos={20} />
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">Reportes y entregas</h1>
        <nav aria-label="Ir a un grupo" className="flex flex-wrap gap-2">
          {visibles.map(({ g, lista }) => (
            <Link
              key={g.estado}
              href={`#grupo-${g.estado}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-borde bg-superficie px-3.5 text-sm font-medium text-tinta no-underline hover:border-marca"
            >
              <span aria-hidden="true" className={cx("size-2.5 rounded-full", g.punto)} />
              {g.corto}
              <span className="cifras rounded-full bg-superficie-2 px-2 text-xs font-semibold">{lista.length}</span>
            </Link>
          ))}
        </nav>
      </header>

      {visibles.map(({ g, lista }) => (
        <section key={g.estado} id={`grupo-${g.estado}`} className="scroll-mt-4 space-y-3" aria-labelledby={`t-${g.estado}`}>
          <div>
            <h2 id={`t-${g.estado}`} className="flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden="true" className={cx("size-2.5 rounded-full", g.punto)} />
              {g.titulo}
              <span className="cifras font-sans text-sm font-normal text-tinta-2">({lista.length})</span>
            </h2>
            {g.ayuda && <p className="text-sm text-tinta-2">{g.ayuda}</p>}
          </div>
          {lista.length === 0 ? (
            <p className="rounded-lg border border-dashed border-borde-fuerte bg-superficie px-4 py-3 text-sm text-tinta-2">Ninguno por ahora.</p>
          ) : (
            <ul className="space-y-3">{lista.map((r) => <TarjetaReporte key={r.id} r={r} borde={g.borde} />)}</ul>
          )}
        </section>
      ))}
    </div>
  );
}

