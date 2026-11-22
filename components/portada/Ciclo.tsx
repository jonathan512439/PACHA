import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Cifra } from "@/components/ui/Cifra";
import { Insignia } from "@/components/ui/Insignia";
import { fechaHora } from "@/components/ui/formato";

export type DatosCiclo = {
  aviso: { vigente: boolean; detalle: string } | null;
  tarjetasVerificadas: number;
  reportesActivos: number;
  comunidadesConReporte: number;
  entregas: number;
  entregasConfirmadas: number;
  ahora: Date;
};

type Paso = {
  n: number;
  titulo: string;
  quien: string;
  imagen: string;
  cifra: ReactNode;
  texto: string;
  enlace: { href: string; texto: string };
};

/** Los 4 pasos del ciclo, cada uno con su número real de hoy. */
export function Ciclo({ datos: d }: { datos: DatosCiclo }) {
  const pasos: Paso[] = [
    {
      n: 1,
      titulo: "Aviso oficial",
      quien: "Senamhi",
      imagen: "/ilustraciones/ciclo-1-aviso.webp",
      cifra: (
        <Cifra
          valor={d.aviso?.vigente ? 1 : 0}
          etiqueta={d.aviso?.vigente ? "aviso vigente" : "avisos vigentes"}
          detalle={d.aviso?.detalle ?? "sin aviso enviado"}
          tono={d.aviso?.vigente ? "naranja" : "tinta"}
        />
      ),
      texto: "Leemos el boletín del Senamhi y una persona aprueba cada alerta. No pronosticamos.",
      enlace: { href: "#aviso", texto: "Ver el aviso" },
    },
    {
      n: 2,
      titulo: "Qué hacer",
      quien: "Tarjeta verificada",
      imagen: "/ilustraciones/ciclo-2-que-hacer.webp",
      cifra: <Cifra valor={d.tarjetasVerificadas} etiqueta="tarjetas verificadas" detalle="cada paso con su fuente y página" />,
      texto: "Con la alerta llega una tarjeta corta, con audio, sacada de guías oficiales.",
      enlace: { href: "/tarjetas", texto: "Ver las tarjetas" },
    },
    {
      n: 3,
      titulo: "La comunidad reporta",
      quien: "Por voz",
      imagen: "/ilustraciones/ciclo-3-reporte.webp",
      cifra: (
        <Cifra
          valor={d.reportesActivos}
          etiqueta={d.reportesActivos === 1 ? "reporte confirmado sin atender" : "reportes confirmados sin atender"}
          detalle={`en ${d.comunidadesConReporte} ${d.comunidadesConReporte === 1 ? "comunidad" : "comunidades"}`}
          tono={d.reportesActivos ? "roja" : "tinta"}
        />
      ),
      texto: "Un audio por WhatsApp o Telegram: qué falta, desde cuándo y cuántas familias.",
      enlace: { href: "#mapa", texto: "Ver el mapa" },
    },
    {
      n: 4,
      titulo: "Ayuda que se puede comprobar",
      quien: "La comunidad confirma",
      imagen: "/ilustraciones/ciclo-4-entrega.webp",
      cifra: (
        <Cifra
          valor={d.entregasConfirmadas}
          unidad={`de ${d.entregas}`}
          etiqueta="entregas confirmadas por la comunidad"
          detalle="con foto, cantidad y respuesta"
          tono={d.entregasConfirmadas ? "verde" : "tinta"}
        />
      ),
      texto: "Cada entrega se registra con foto, y la comunidad responde si llegó o no.",
      enlace: { href: "/entregas", texto: "Ver las entregas" },
    },
  ];

  return (
    <section aria-labelledby="ciclo-titulo" className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <h2 id="ciclo-titulo" className="text-2xl font-semibold sm:text-3xl">El ciclo completo, con datos de hoy</h2>
        <p className="text-sm text-tinta-2">
          Actualizado el {fechaHora(d.ahora)} (hora de Bolivia) · <Insignia tipo="ejemplo">Comunidades y reportes de EJEMPLO</Insignia>
        </p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pasos.map((p) => (
          <li key={p.n} className="flex gap-4 rounded-xl border border-borde bg-superficie p-4 shadow-suave sm:flex-col">
            <Image
              src={p.imagen}
              alt=""
              width={768}
              height={768}
              sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 96px"
              className="size-24 shrink-0 rounded-lg object-cover sm:aspect-[4/3] sm:h-auto sm:w-full"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-acento">
                  Paso {p.n} · {p.quien}
                </p>
                <h3 className="mt-0.5 text-lg font-semibold leading-snug">{p.titulo}</h3>
              </div>
              {p.cifra}
              <p className="text-sm text-tinta-2">{p.texto}</p>
              <Link href={p.enlace.href} className="mt-auto text-sm font-semibold text-marca underline hover:no-underline">
                {p.enlace.texto}
              </Link>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-tinta-2">Ilustraciones generadas con IA.</p>
    </section>
  );
}
