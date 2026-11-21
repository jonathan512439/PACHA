import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/supabase";
import { BotonReiniciar } from "./reiniciar";
import s from "./panel.module.css";

export default function PanelPage() {
  return (
    <Suspense fallback={<main className={s.content}>Cargando resumen…</main>}>
      <Resumen />
    </Suspense>
  );
}

async function Resumen() {
  await connection();
  const supabase = db();
  const [
    { count: reportes, error: errorReportes },
    { count: enRevision, error: errorRevision },
    { count: alertas, error: errorAlertas },
    { count: comunidades, error: errorComunidades },
  ] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "revisar"),
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "enviada"),
    supabase.from("communities").select("id", { count: "exact", head: true }),
  ]);
  if (errorReportes) throw new Error(`No se pudieron contar los reportes: ${errorReportes.message}`);
  if (errorRevision) throw new Error(`No se pudieron contar los reportes en revisión: ${errorRevision.message}`);
  if (errorAlertas) throw new Error(`No se pudieron contar las alertas: ${errorAlertas.message}`);
  if (errorComunidades) throw new Error(`No se pudieron contar las comunidades: ${errorComunidades.message}`);

  return (
    <main className={s.content}>
      <header className={s.pageHeader}>
        <div>
          <span className={s.eyebrow}>CENTRO DE OPERACIONES</span>
          <h1>Resumen</h1>
          <p>Reportes comunitarios y avisos para el municipio de Toledo.</p>
        </div>
        <BotonReiniciar />
      </header>

      <section aria-label="Estado del sistema" className={s.metricGrid}>
        {[
          ["Comunidades", comunidades ?? 0],
          ["Reportes", reportes ?? 0],
          ["En revisión", enRevision ?? 0],
          ["Alertas enviadas", alertas ?? 0],
        ].map(([label, total]) => (
          <article className={s.metric} key={label}>
            <span>{label}</span>
            <strong>{total}</strong>
          </article>
        ))}
      </section>

      <section className={s.panelWelcome}>
        <span className={s.welcomeMark} aria-hidden="true">✳</span>
        <div>
          <h2>Una respuesta clara empieza con datos verificables.</h2>
          <p>
            Revisa los reportes, corrige datos y registra entregas. Las alertas
            solo se envían después de la aprobación de una persona.
          </p>
        </div>
      </section>
    </main>
  );
}
