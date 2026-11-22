import Link from "next/link";
import { rangoFechas } from "@/contratos/tipos";
import { Aviso, type NivelAviso } from "@/components/ui/Aviso";
import { hoyBolivia } from "@/components/ui/formato";
import type { AlertaPublica } from "@/lib/datos-publicos";

const AMENAZA: Record<string, string> = { helada: "helada", sequia: "sequía", nevada: "nevada" };

/**
 * Nivel de la banda según el riesgo que publica el Senamhi (nunca lo decidimos nosotros):
 * alto → roja, medio → naranja. Sin riesgo o bajo → aviso informativo.
 * TODO(H3): usar nivelAlerta(aviso) de contratos/tipos.ts cuando SERVIDOR lo suba.
 */
export function nivelBanda(risk_level: string | null): NivelAviso {
  return risk_level === "alto" ? "roja" : risk_level === "medio" ? "naranja" : "info";
}

/** Banda del aviso oficial vigente, arriba de la portada. */
export function BandaAviso({ alerta, hoy = hoyBolivia() }: { alerta: (AlertaPublica & { fuente_url: string | null }) | null; hoy?: string }) {
  if (!alerta) {
    return (
      <Aviso nivel="info" titulo="No hay un aviso del Senamhi vigente en este momento.">
        PACHA revisa cada día el boletín agrometeorológico del Senamhi para el Altiplano.
      </Aviso>
    );
  }
  const vigente = alerta.valid_to >= hoy;
  const amenaza = AMENAZA[alerta.hazard] ?? alerta.hazard;
  const nivel = vigente ? nivelBanda(alerta.risk_level) : "info";
  const fuerte = nivel === "roja" || nivel === "naranja";
  const titulo = fuerte
    ? `${amenaza.toUpperCase()}${nivel === "roja" && alerta.hazard === "helada" ? " FUERTE" : ""}`
    : vigente
      ? `Aviso de ${amenaza} del Senamhi`
      : `Último aviso de ${amenaza} del Senamhi (ya terminó)`;

  return (
    <Aviso
      nivel={nivel}
      titulo={titulo}
      role="region"
      accion={
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          {alerta.lesson_id && <Link href={`/tarjetas/${alerta.lesson_id}`}>{vigente ? "Qué hacer hoy" : "Qué hacer"}</Link>}
          {alerta.fuente_url && (
            <a href={alerta.fuente_url} target="_blank" rel="noopener noreferrer">
              Ver el boletín original del Senamhi<span className="sr-only"> (PDF, abre en otra pestaña)</span>
            </a>
          )}
        </span>
      }
    >
      <p className="font-semibold">
        {alerta.zona ?? "Altiplano"} · {rangoFechas(alerta.valid_from, alerta.valid_to)}
        {alerta.risk_level && <> · Riesgo {alerta.risk_level.toUpperCase()} según el Senamhi</>}
      </p>
      <p>El boletín dice: “{alerta.cita_evento}”</p>
      {alerta.cita_riesgo && <p>Riesgo: “{alerta.cita_riesgo}”</p>}
      <p className="text-xs opacity-95">Fuente oficial: Senamhi, boletín agrometeorológico decenal.</p>
    </Aviso>
  );
}
