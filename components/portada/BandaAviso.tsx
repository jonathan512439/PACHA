import Link from "next/link";
import { nivelAlerta, type NivelSenamhi, type Riesgo } from "@/contratos/tipos";
import { Aviso } from "@/components/ui/Aviso";
import { hoyBolivia, periodo } from "@/components/ui/formato";
import type { AlertaPublica } from "@/lib/datos-publicos";

const AMENAZA: Record<string, string> = { helada: "helada", sequia: "sequía", nevada: "nevada" };

/**
 * Nivel de la banda: el de la alerta según el Senamhi (H3, `nivelAlerta` del contrato), nunca lo decidimos nosotros.
 * Rojo o riesgo alto → roja; naranja o riesgo medio → naranja; lo demás → aviso informativo.
 */
export function nivelBanda(a: { risk_level: string | null; senamhi_level?: string | null }): "roja" | "naranja" | "info" {
  return nivelAlerta({ risk_level: a.risk_level as Riesgo | null, senamhi_level: (a.senamhi_level ?? null) as NivelSenamhi | null }) ?? "info";
}

/**
 * La cita es LITERAL, pero puede venir cortada a 200 caracteres en medio de una palabra:
 * se corta en la última palabra completa y se marca con "…" (no se agrega ni se cambia nada más).
 */
export function citaLegible(cita: string): string {
  const t = cita.trim();
  if (t.length < 190 || /[.!?;:)»"”]$/.test(t)) return t;
  const corte = t.lastIndexOf(" ");
  return `${(corte > 0 ? t.slice(0, corte) : t).replace(/[\s,;:]+$/, "")}…`;
}

const CLASES_ENLACE = "inline-flex min-h-10 items-center";

/** Banda del aviso oficial vigente, arriba de la portada. */
export function BandaAviso({ alerta, hoy = hoyBolivia() }: { alerta: (AlertaPublica & { fuente_url: string | null }) | null; hoy?: string }) {
  if (!alerta) {
    return (
      <Aviso nivel="info" titulo="No hay avisos vigentes del Senamhi.">
        El boletín del Senamhi se revisa cada día.
      </Aviso>
    );
  }
  const vigente = alerta.valid_to >= hoy;
  const amenaza = AMENAZA[alerta.hazard] ?? alerta.hazard;
  const nivel = vigente ? nivelBanda(alerta) : "info";
  const fuerte = nivel === "roja" || nivel === "naranja";
  const titulo = fuerte
    ? `${amenaza.toUpperCase()}${nivel === "roja" && alerta.hazard !== "sequia" ? " FUERTE" : ""}`
    : vigente
      ? `Aviso de ${amenaza} del Senamhi`
      : `Último aviso de ${amenaza} del Senamhi (ya terminó)`;

  return (
    <Aviso
      nivel={nivel}
      titulo={titulo}
      role="region"
      accion={
        <span className="flex flex-wrap gap-x-5">
          {alerta.lesson_id && <Link href={`/tarjetas/${alerta.lesson_id}`} className={CLASES_ENLACE}>Qué hacer</Link>}
          {alerta.fuente_url && (
            <a href={alerta.fuente_url} target="_blank" rel="noopener noreferrer" className={CLASES_ENLACE}>
              Boletín del Senamhi (PDF)<span className="sr-only">, abre en otra pestaña</span>
            </a>
          )}
        </span>
      }
    >
      <p className="font-semibold">
        {alerta.zona ?? "Altiplano"} · {periodo(alerta.valid_from, alerta.valid_to)}
        {alerta.risk_level && <> · Riesgo {alerta.risk_level.toUpperCase()} según el Senamhi</>}
      </p>
      <p>El boletín dice: “{citaLegible(alerta.cita_evento)}”</p>
      {alerta.cita_riesgo && <p>Riesgo: “{citaLegible(alerta.cita_riesgo)}”</p>}
      <p className="text-xs opacity-95">Fuente: Senamhi, boletín agrometeorológico decenal.</p>
    </Aviso>
  );
}
