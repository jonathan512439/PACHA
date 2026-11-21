import { connection } from "next/server";
import { Suspense } from "react";
import {
  AvisoGemini,
  construirMensajeAlerta,
  decidirAlerta,
  tarjetaParaAlerta,
} from "@/contratos/tipos";
import { obtenerTarjeta } from "@/lib/tarjetas";
import fixture from "@/fixtures/aviso-altiplano-2026-11-2.json";
import { AlertasPanel } from "./panel-alertas";

export default function AlertasPage() {
  return (
    <Suspense fallback={<main>Cargando alertas…</main>}>
      <ContenidoAlertas />
    </Suspense>
  );
}

async function ContenidoAlertas() {
  await connection();
  const aviso = AvisoGemini.parse(fixture.aviso);
  const decision = decidirAlerta(aviso);
  const tarjeta = aviso.fenomeno === "ninguno"
    ? null
    : await obtenerTarjeta(tarjetaParaAlerta(aviso.fenomeno));
  const mensaje = decision.alertar && tarjeta
    ? construirMensajeAlerta({ aviso, tarjeta, boletinEsEjemplo: true })
    : null;

  return (
    <AlertasPanel
      aviso={{
        zona: aviso.zona,
        estacion: aviso.estacion,
        fenomeno: aviso.fenomeno,
        riesgo: decision.riesgo,
        minima: aviso.temp_minima_c,
        citaEvento: aviso.cita_evento,
        citaRiesgo: aviso.cita_riesgo,
        periodoInicio: aviso.periodo_inicio,
        periodoFin: aviso.periodo_fin,
      }}
      decision={decision}
      mensaje={mensaje}
      tarjeta={tarjeta ? {
        id: tarjeta.id,
        titulo: tarjeta.title,
        fuente: tarjeta.source_doc,
        pagina: tarjeta.source_page,
        pasos: tarjeta.steps,
        etiquetaEstado: tarjeta.status === "revisada"
          ? `Revisada por ${tarjeta.reviewed_by}`
          : tarjeta.status === "verificada"
            ? "Verificada contra fuente"
            : "BORRADOR · sin verificar",
      } : null}
      fuenteUrl={fixture.fuente_url}
    />
  );
}
