"use client";

import type { AvisoGemini, DecisionAlerta, Riesgo } from "@/contratos/tipos";
import s from "../panel.module.css";

type DatosAviso = {
  zona: string | null;
  estacion: string | null;
  fenomeno: AvisoGemini["fenomeno"];
  riesgo: Riesgo | null;
  minima: number | null;
  citaEvento: string | null;
  citaRiesgo: string | null;
  periodoInicio: string | null;
  periodoFin: string | null;
};

type DatosTarjeta = {
  id: string;
  titulo: string;
  fuente: string;
  pagina: string;
  pasos: [string, string, string];
  etiquetaEstado: string;
};

const nombreFenomeno: Record<AvisoGemini["fenomeno"], string> = {
  helada: "Helada",
  nevada: "Nevada",
  sequia: "Sequía",
  ninguno: "Sin fenómeno",
};

function nombreRiesgo(riesgo: Riesgo | null) {
  return riesgo ? `${riesgo[0].toUpperCase()}${riesgo.slice(1)}` : "No identificado";
}

function fecha(valor: string | null) {
  if (!valor) return "No indicada";
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${valor}T12:00:00Z`));
}

export function AlertasPanel({
  aviso,
  decision,
  tarjeta,
  mensaje,
  fuenteUrl,
}: {
  aviso: DatosAviso;
  decision: DecisionAlerta;
  tarjeta: DatosTarjeta | null;
  mensaje: string | null;
  fuenteUrl: string;
}) {
  return (
    <main className={s.content}>
      <header className={s.pageHeader}>
        <div>
          <span className={s.eyebrow}>CENTRO DE OPERACIONES</span>
          <h1>Alertas</h1>
          <p>Revisa las citas del boletín y la propuesta antes de cualquier envío.</p>
        </div>
        <span className={s.fixtureBadge}>VISTA PREVIA · FIXTURE</span>
      </header>

      <div className={s.alertGrid}>
        <section aria-label="Vista previa del boletín" className={s.alertCard}>
          <span className={s.kicker}>SENAMHI · BOLETÍN HISTÓRICO DE EJEMPLO</span>
          <h2>{aviso.zona ?? "Zona sin identificar"}</h2>
          <div className={s.alertFacts}>
            <div><span>Fenómeno</span><strong>{nombreFenomeno[aviso.fenomeno]}</strong></div>
            <div><span>Riesgo extraído</span><strong>{nombreRiesgo(aviso.riesgo)}</strong></div>
            <div><span>Temperatura mínima</span><strong>{aviso.minima === null ? "No indicada" : `${aviso.minima} °C`}</strong></div>
            <div><span>Estación</span><strong>{aviso.estacion ?? "No indicada"}</strong></div>
            <div><span>Desde</span><strong>{fecha(aviso.periodoInicio)}</strong></div>
            <div><span>Hasta</span><strong>{fecha(aviso.periodoFin)}</strong></div>
          </div>

          <div className={s.citation}>
            <span>Cita del evento</span>
            <blockquote>{aviso.citaEvento ? `“${aviso.citaEvento}”` : "El fixture no contiene cita del evento."}</blockquote>
          </div>
          <div className={s.citation}>
            <span>Cita del riesgo</span>
            <blockquote>{aviso.citaRiesgo ? `“${aviso.citaRiesgo}”` : "El fixture no contiene cita de riesgo."}</blockquote>
          </div>
          <div className={s.reasonBox}>
            <strong>Motivo de decisión · regla del proyecto</strong>
            <p>{decision.motivo}</p>
          </div>
          <a className={s.sourceLink} href={fuenteUrl} rel="noreferrer" target="_blank">
            Consultar PDF de origen ↗
          </a>
        </section>

        <section aria-label="Mensaje y tarjeta asignada" className={s.alertCard}>
          <span className={s.kicker}>PROPUESTA · NO ENVIADA</span>
          <h2>Mensaje armado</h2>
          {mensaje ? (
            <pre className={s.previewMessage}>{mensaje}</pre>
          ) : (
            <p className={s.pendingNote}>
              {decision.alertar
                ? "No se pudo armar el mensaje: la tarjeta asignada no está disponible en la base de datos."
                : "La regla no recomienda una alerta; por eso no se arma un mensaje para enviar."}
            </p>
          )}

          <div className={s.assignedCard}>
            <span>Tarjeta asignada por regla</span>
            {tarjeta ? (
              <>
                <strong>{tarjeta.titulo} · {tarjeta.id}</strong>
                <p>{tarjeta.etiquetaEstado} · {tarjeta.fuente}, pág. {tarjeta.pagina}</p>
                <ol>
                  {tarjeta.pasos.map((paso, index) => <li key={`${tarjeta.id}-${index}`}>{paso}</li>)}
                </ol>
              </>
            ) : (
              <p>{aviso.fenomeno === "ninguno" ? "No corresponde una tarjeta para este fenómeno." : "La tarjeta correspondiente todavía no está cargada."}</p>
            )}
          </div>

          <div className={s.alertControls}>
            <button className={s.disabledButton} disabled type="button">Buscar boletín ahora · API pendiente</button>
            <label>
              Subida manual de PDF · respaldo
              <input accept="application/pdf" disabled type="file" />
            </label>
            <div className={s.buttonRow}>
              <button className={s.disabledButton} disabled type="button">Aprobar · API pendiente</button>
              <button className={s.disabledButton} disabled type="button">Enviar · API pendiente</button>
            </div>
          </div>

          <div className={s.deliveryStats}>
            <span>Envíos realizados<strong>Sin datos</strong></span>
            <span>Fallidos<strong>Sin datos</strong></span>
          </div>
          <p className={s.pendingNote}>Los contadores no consultan envíos reales. Las acciones se habilitarán cuando A entregue las APIs.</p>
        </section>
      </div>
    </main>
  );
}
