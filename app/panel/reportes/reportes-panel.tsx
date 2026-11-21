"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import type { EstadoReportePanel, ReportePanel as ReportePanelTipo } from "@/lib/panel/tipos";
import s from "../panel.module.css";

const RespuestaReporte = z.object({
  status: z.enum(["por_confirmar", "confirmado", "atendido", "revisar", "descartado"]),
  payload: z.record(z.string(), z.unknown()),
  priority_score: z.number().nullable(),
});

const estados: { id: EstadoReportePanel; label: string }[] = [
  { id: "confirmado", label: "Confirmados" },
  { id: "revisar", label: "En revisión" },
  { id: "atendido", label: "Atendidos" },
  { id: "descartado", label: "Descartados" },
  { id: "por_confirmar", label: "Por confirmar" },
];

const nombreTipo: Record<ReportePanelTipo["tipo"], string> = {
  agua: "Agua",
  dano: "Daño",
  forraje: "Forraje",
  otro: "Otro",
};

const nombreEstado: Record<EstadoReportePanel, string> = {
  por_confirmar: "Por confirmar",
  confirmado: "Confirmado",
  atendido: "Atendido",
  revisar: "En revisión",
  descartado: "Descartado",
};

function mostrarFecha(valor: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor));
}

function valorCampo(valor: number | null) {
  return valor === null ? "" : String(valor);
}

function FormularioEntrega({
  procesando,
  onSubmit,
}: {
  procesando: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [tipo, setTipo] = useState<"cisterna" | "forraje">("cisterna");
  const unidad = tipo === "cisterna" ? "cisternas" : "kg";

  return (
    <form className={s.deliveryForm} onSubmit={onSubmit}>
      <label>
        Tipo de entrega
        <select
          name="kind"
          onChange={(event) => {
            const valor = event.currentTarget.value;
            if (valor === "cisterna" || valor === "forraje") setTipo(valor);
          }}
          value={tipo}
        >
          <option value="cisterna">Cisterna</option>
          <option value="forraje">Forraje</option>
        </select>
      </label>
      <label>
        Cantidad
        <input min="0.01" name="quantity" required step="any" type="number" />
      </label>
      <div className={s.unitField}>
        <span>Unidad</span>
        <strong>{unidad}</strong>
        <input name="unit" readOnly type="hidden" value={unidad} />
      </div>
      <label className={s.photoInput}>
        Foto de la entrega
        <input accept="image/jpeg,image/png,image/webp" name="photo" required type="file" />
        <small>Solo objetos, sin personas ni EXIF. Máximo 5 MB.</small>
      </label>
      <button disabled={procesando} type="submit">
        {procesando ? "Guardando…" : "Guardar entrega"}
      </button>
    </form>
  );
}

export function ReportesPanel({ iniciales }: { iniciales: ReportePanelTipo[] }) {
  const [reportes, setReportes] = useState(iniciales);
  const [filtro, setFiltro] = useState<EstadoReportePanel>("confirmado");
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Record<string, string>>({});
  const visibles = reportes.filter((reporte) => reporte.estado === filtro);

  function mensaje(id: string, texto: string) {
    setMensajes((actuales) => ({ ...actuales, [id]: texto }));
  }

  async function actualizar(id: string, cambios: Record<string, unknown>) {
    if (procesando) return;
    setProcesando(id);
    mensaje(id, "");
    try {
      const respuesta = await fetch(`/api/panel/reportes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      const cuerpo: unknown = await respuesta.json();
      const resultado = RespuestaReporte.safeParse(cuerpo);
      if (!respuesta.ok || !resultado.success) {
        const detalle =
          typeof cuerpo === "object" && cuerpo !== null && "error" in cuerpo && typeof cuerpo.error === "string"
            ? cuerpo.error
            : "No se pudo actualizar el reporte.";
        throw new Error(detalle);
      }
      const actualizado = resultado.data;
      setReportes((actuales) =>
        actuales.map((reporte) =>
          reporte.id === id
            ? {
                ...reporte,
                estado: actualizado.status,
                puntaje: actualizado.priority_score,
                diasSinRecurso: typeof actualizado.payload.dias_sin_recurso === "number" ? actualizado.payload.dias_sin_recurso : null,
                familias: typeof actualizado.payload.familias_afectadas === "number" ? actualizado.payload.familias_afectadas : null,
                animales: typeof actualizado.payload.animales_afectados === "number" ? actualizado.payload.animales_afectados : null,
              }
            : reporte,
        ),
      );
      mensaje(id, cambios.accion === "confirmar" ? "Reporte confirmado." : cambios.accion === "descartar" ? "Reporte descartado." : "Datos corregidos.");
    } catch (error) {
      console.error("No se pudo actualizar el reporte:", error);
      mensaje(id, error instanceof Error ? error.message : "No se pudo actualizar el reporte.");
    } finally {
      setProcesando(null);
    }
  }

  async function registrarEntrega(id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (procesando) return;
    const form = event.currentTarget;
    const datos = new FormData(form);
    datos.set("reportId", id);
    setProcesando(id);
    mensaje(id, "");
    try {
      const respuesta = await fetch("/api/entregas", { method: "POST", body: datos });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        const detalle =
          typeof cuerpo === "object" && cuerpo !== null && "error" in cuerpo && typeof cuerpo.error === "string"
            ? cuerpo.error
            : "No se pudo registrar la entrega.";
        throw new Error(detalle);
      }
      setReportes((actuales) =>
        actuales.map((reporte) =>
          reporte.id === id ? { ...reporte, estado: "atendido", atendido: new Date().toISOString() } : reporte,
        ),
      );
      mensaje(id, "Entrega registrada. La confirmación del bot se integrará cuando esté disponible.");
    } catch (error) {
      console.error("No se pudo registrar la entrega:", error);
      mensaje(id, error instanceof Error ? error.message : "No se pudo registrar la entrega.");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <main className={s.content}>
      <header className={s.pageHeader}>
        <div>
          <span className={s.eyebrow}>GESTIÓN COMUNITARIA</span>
          <h1>Reportes</h1>
          <p>Escucha, corrige y responde a los reportes de las comunidades.</p>
        </div>
        <span className={s.recordCount}>{reportes.length} registros recientes</span>
      </header>

      <div aria-label="Filtrar reportes por estado" className={s.tabs} role="tablist">
        {estados.map((estado) => {
          const cantidad = reportes.filter((reporte) => reporte.estado === estado.id).length;
          return (
            <button
              aria-selected={filtro === estado.id}
              className={filtro === estado.id ? s.tabActive : s.tab}
              key={estado.id}
              onClick={() => setFiltro(estado.id)}
              role="tab"
              type="button"
            >
              {estado.label}<span>{cantidad}</span>
            </button>
          );
        })}
      </div>

      <section aria-label={estados.find((estado) => estado.id === filtro)?.label} className={s.reportList}>
        {visibles.length ? visibles.map((reporte) => (
          <article className={s.reportCard} key={reporte.id}>
            <div className={s.reportTop}>
              <div>
                <span className={s.reportType}>{nombreTipo[reporte.tipo]}</span>
                <h2>{reporte.comunidad}</h2>
                {reporte.comunidadEjemplo && <span className={s.exampleLabel}>EJEMPLO</span>}
              </div>
              <div className={s.reportMeta}>
                <span className={`${s.status} ${s[`status_${reporte.estado}`]}`}>{nombreEstado[reporte.estado]}</span>
                <time dateTime={reporte.fecha}>{mostrarFecha(reporte.fecha)}</time>
              </div>
            </div>

            <p className={s.transcript}>
              {reporte.transcripcion ? `“${reporte.transcripcion}”` : "Sin transcripción disponible."}
            </p>
            {reporte.audioUrl && (
              <div className={s.reportAudio}>
                <span>Audio del reporte · enlace privado temporal</span>
                <audio controls preload="none" src={reporte.audioUrl}>Tu navegador no puede reproducir este audio.</audio>
              </div>
            )}

            <div className={s.reportFacts}>
              <span><strong>Prioridad</strong>{reporte.puntaje === null ? "Sin calcular" : reporte.puntaje.toFixed(1)}</span>
              <span><strong>Días</strong>{reporte.diasSinRecurso ?? "No indicado"}</span>
              <span><strong>Familias</strong>{reporte.familias ?? "No indicado"}</span>
              <span><strong>Animales</strong>{reporte.animales ?? "No indicado"}</span>
            </div>

            <details className={s.editDetails}>
              <summary>Corregir datos del reporte</summary>
              <form
                className={s.correctionForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const leer = (nombre: string, maximo?: number) => {
                    const raw = String(form.get(nombre) ?? "").trim();
                    if (!raw) return null;
                    const number = Number(raw);
                    if (!Number.isInteger(number) || number < 0 || (maximo !== undefined && number > maximo)) {
                      throw new Error(`${nombre} debe ser un entero válido.`);
                    }
                    return number;
                  };
                  try {
                    void actualizar(reporte.id, {
                      dias_sin_recurso: leer("dias_sin_recurso", 60),
                      familias_afectadas: leer("familias_afectadas"),
                      animales_afectados: leer("animales_afectados"),
                    });
                  } catch (error) {
                    mensaje(reporte.id, error instanceof Error ? error.message : "Revisa los datos ingresados.");
                  }
                }}
              >
                <label>Días sin recurso<input defaultValue={valorCampo(reporte.diasSinRecurso)} max={60} min={0} name="dias_sin_recurso" type="number" /></label>
                <label>Familias<input defaultValue={valorCampo(reporte.familias)} min={0} name="familias_afectadas" type="number" /></label>
                <label>Animales<input defaultValue={valorCampo(reporte.animales)} min={0} name="animales_afectados" type="number" /></label>
                <button disabled={procesando === reporte.id} type="submit">Guardar correcciones</button>
              </form>
            </details>

            {reporte.estado === "revisar" && (
              <div className={s.reportActions}>
                <button disabled={procesando === reporte.id} onClick={() => void actualizar(reporte.id, { accion: "confirmar" })} type="button">
                  Confirmar reporte
                </button>
                <button className={s.discardButton} disabled={procesando === reporte.id} onClick={() => void actualizar(reporte.id, { accion: "descartar" })} type="button">
                  Descartar
                </button>
              </div>
            )}

            {reporte.estado === "confirmado" && (
              <details className={s.editDetails}>
                <summary>Registrar entrega</summary>
                <FormularioEntrega
                  onSubmit={(event) => void registrarEntrega(reporte.id, event)}
                  procesando={procesando === reporte.id}
                />
              </details>
            )}

            {mensajes[reporte.id] && <p className={s.actionMessage} role="status">{mensajes[reporte.id]}</p>}
          </article>
        )) : (
          <div className={s.emptyState}>
            <span aria-hidden="true">✓</span>
            <h2>No hay reportes en este estado</h2>
            <p>Los nuevos reportes aparecerán aquí cuando se reciban.</p>
          </div>
        )}
      </section>
    </main>
  );
}
