"use client";

import { useEffect, useRef, useState } from "react";
import { DatosMapaPublico, type DatosMapaPublico as DatosMapaPublicoTipo } from "@/lib/tipos-publicos";
import { PESOS, TOPES } from "@/contratos/prioridad";
import { MapaDinamico } from "./MapaDinamico";
import s from "./mapa.module.css";

function fechaLarga(iso: string) {
  const parsed = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function porcentaje(valor: number) {
  return `${valor}%`;
}

export function MapaInicio({ inicial }: { inicial: DatosMapaPublicoTipo }) {
  const [datos, setDatos] = useState(inicial);
  const [errorActualizacion, setErrorActualizacion] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const enVuelo = useRef(false);

  useEffect(() => {
    let desmontado = false;
    const actualizar = async () => {
      if (enVuelo.current) return;
      enVuelo.current = true;
      setActualizando(true);
      try {
        const respuesta = await fetch("/api/publico/mapa", { cache: "no-store" });
        const cuerpo: unknown = await respuesta.json();
        if (!respuesta.ok) throw new Error("El servidor no pudo actualizar el mapa.");
        const parseado = DatosMapaPublico.safeParse(cuerpo);
        if (!parseado.success) throw new Error("La respuesta del mapa no coincide con el contrato.");
        if (!desmontado) {
          setDatos(parseado.data);
          setErrorActualizacion("");
        }
      } catch (error) {
        console.error("No se pudo actualizar el mapa:", error);
        if (!desmontado) setErrorActualizacion("No se pudo actualizar; se muestran los últimos datos recibidos.");
      } finally {
        enVuelo.current = false;
        if (!desmontado) setActualizando(false);
      }
    };

    const intervalo = window.setInterval(() => void actualizar(), 12_000);
    return () => {
      desmontado = true;
      window.clearInterval(intervalo);
    };
  }, []);

  const activas = datos.comunidades.filter((comunidad) => comunidad.prioridad.estado === "activa").length;
  const horaActualizacion = new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(datos.actualizado));

  return (
    <main className={s.page}>
      <section className={s.hero}>
        <div>
          <span className={s.eyebrow}>PACHA · ORURO</span>
          <h1>Información para responder en comunidad.</h1>
          <p>
            Avisos del Senamhi y reportes confirmados, organizados para orientar
            la atención en el municipio de Toledo.
          </p>
        </div>
        <div className={s.updated}>
          <span className={actualizando ? s.pulse : s.liveDot} />
          <span>{actualizando ? "Actualizando…" : "Actualización automática cada 12 s"}</span>
        </div>
      </section>

      <div className={s.stats}>
        <div>
          <strong>{datos.comunidades.length}</strong>
          <span>comunidades en el mapa</span>
        </div>
        <div>
          <strong>{activas}</strong>
          <span>con reportes confirmados</span>
        </div>
        <span className={s.exampleTag}>Datos de ejemplo identificados</span>
        <span className={s.updateTime}>Actualizado a las {horaActualizacion}</span>
      </div>

      {errorActualizacion && <p className={s.updateError} role="status">{errorActualizacion}</p>}

      <section className={s.dashboard} aria-label="Mapa y alerta enviada">
        <article className={s.mapPanel}>
          <div className={s.panelTitle}>
            <div>
              <span className={s.kicker}>TOLEDO · ORURO</span>
              <h2>Prioridad por comunidad</h2>
            </div>
            <span className={s.pinCount}>{datos.comunidades.length} ubicaciones</span>
          </div>
          <MapaDinamico comunidades={datos.comunidades} />
          <div className={s.legend} aria-label="Leyenda de prioridad">
            {([
              ["rojo", "Alta"],
              ["naranja", "Media"],
              ["amarillo", "En observación"],
              ["verde", "Baja"],
              ["gris", "Sin reportes"],
            ] as const).map(([color, etiqueta]) => (
              <span key={color}>
                <i className={s[color]} /> {etiqueta}
              </span>
            ))}
          </div>
          <p className={s.mapNote}>
            Los puntos son referencias aproximadas. Cada comunidad y entrega de demostración está marcada como EJEMPLO.
          </p>
        </article>

        <aside className={s.alertPanel} aria-label="Alerta más reciente">
          <div className={s.alertTitle}>
            <span className={s.kicker}>SENAMHI · ALERTA ENVIADA</span>
            {datos.alerta && datos.alerta.boletinEjemplo && <span className={s.exampleTag}>EJEMPLO</span>}
          </div>
          {datos.alerta ? (
            <>
              <span className={s.alertIcon} aria-hidden="true">!</span>
              <p className={s.alertHazard}>
                {datos.alerta.amenaza === "helada" ? "Helada" : datos.alerta.amenaza === "sequia" ? "Sequía" : "Nevada"}
                {datos.alerta.riesgo ? ` · riesgo ${datos.alerta.riesgo}` : ""}
              </p>
              <h2>{datos.alerta.zona ?? "Altiplano de Oruro"}</h2>
              <blockquote>“{datos.alerta.citaEvento}”</blockquote>
              <div className={s.alertDates}>
                <span>Vigencia</span>
                <strong>
                  {fechaLarga(datos.alerta.fechaInicio)} – {fechaLarga(datos.alerta.fechaFin)}
                </strong>
              </div>
              <div className={s.alertDates}>
                <span>Enviada</span>
                <strong>{fechaLarga(datos.alerta.enviada)}</strong>
              </div>
              {datos.alerta.fuenteUrl ? (
                <a className={s.sourceLink} href={datos.alerta.fuenteUrl} rel="noreferrer" target="_blank">
                  Abrir boletín fuente <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span className={s.noSource}>Boletín cargado manualmente</span>
              )}
            </>
          ) : (
            <div className={s.noAlert}>
              <span className={s.quietIcon} aria-hidden="true">✓</span>
              <h2>No hay alertas enviadas</h2>
              <p>Cuando se envíe una alerta aprobada, aquí aparecerán sus citas y fuente.</p>
            </div>
          )}
        </aside>
      </section>

      <section className={s.method} id="como-se-calcula">
        <div className={s.methodHeading}>
          <span className={s.kicker}>CRITERIOS PÚBLICOS</span>
          <h2>¿Cómo se calcula?</h2>
          <p>
            Se muestra el reporte confirmado con mayor puntaje de cada comunidad.
            Los datos ausentes se estiman con valor neutro y se marcan en el desglose.
          </p>
        </div>
        <div className={s.criteria}>
          <div><strong>{porcentaje(PESOS.sinRecurso)}</strong><span>Días sin agua o forraje · tope {TOPES.dias} días</span></div>
          <div><strong>{porcentaje(PESOS.familias)}</strong><span>Familias afectadas · tope {TOPES.familias}</span></div>
          <div><strong>{porcentaje(PESOS.animales)}</strong><span>Animales afectados · tope {TOPES.animales.toLocaleString("es-BO")}</span></div>
          <div><strong>{porcentaje(PESOS.espera)}</strong><span>Tiempo de espera · tope {TOPES.esperaDias} días</span></div>
        </div>
        <p className={s.formula}>
          Puntaje = Σ (peso × min(max(dato ÷ tope, 0), 1)); dato faltante = 0,5.
          <span> Rojo ≥ 70 · naranja ≥ 50 · amarillo ≥ 30 · verde &lt; 30 · gris = sin reportes.</span>
        </p>
      </section>
    </main>
  );
}
