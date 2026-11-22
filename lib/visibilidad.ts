import "server-only";
import { db } from "@/lib/supabase";
import { comunidadesConPrioridad, type ComunidadMapa } from "@/lib/datos-publicos";
import { VACIA, visibilidadPorComunidad, type EntregaVis, type ReporteVis, type VisibilidadComunidad } from "@/lib/visibilidad-calculo";

/*
 * «Sin agua, a la vista»: consultas públicas. Solo datos confirmados por la comunidad.
 * NUNCA devuelve transcripciones, audios, teléfonos ni nombres de personas.
 */

type FilaReporte = {
  id: string; community_id: string; type: ReporteVis["type"]; factor: string | null; status: ReporteVis["status"];
  created_at: string; confirmed_at: string | null; payload: Record<string, unknown> | null;
};

const aReporteVis = (r: FilaReporte): ReporteVis => ({
  id: r.id, community_id: r.community_id, type: r.type, factor: r.factor, status: r.status,
  created_at: r.created_at, confirmed_at: r.confirmed_at,
  dias: typeof r.payload?.dias_sin_recurso === "number" ? r.payload.dias_sin_recurso : null,
  familias: typeof r.payload?.familias_afectadas === "number" ? r.payload.familias_afectadas : null,
});

const COLUMNAS_ENTREGA = "id, community_id, report_id, kind, quantity, unit, delivered_at, confirmed_by_community, confirmed_at, is_example";

/** Reportes confirmados o atendidos y todas las entregas (opcionalmente de una sola comunidad). */
export async function reportesYEntregas(comunidad?: string): Promise<{ reportes: ReporteVis[]; entregas: EntregaVis[] }> {
  let qr = db().from("reports").select("id, community_id, type, factor, status, created_at, confirmed_at, payload").in("status", ["confirmado", "atendido"]);
  let qe = db().from("deliveries").select(COLUMNAS_ENTREGA);
  if (comunidad) { qr = qr.eq("community_id", comunidad); qe = qe.eq("community_id", comunidad); }
  const [{ data: rs, error: e1 }, { data: es, error: e2 }] = await Promise.all([qr, qe]);
  if (e1 || e2) throw new Error((e1 ?? e2)!.message);
  return {
    reportes: ((rs ?? []) as FilaReporte[]).map(aReporteVis),
    entregas: ((es ?? []) as EntregaVis[]).map((e) => ({ ...e, quantity: Number(e.quantity) })),
  };
}

export type ComunidadVisible = ComunidadMapa & { vis: VisibilidadComunidad };

/** Comunidades con su prioridad (ordenadas de mayor a menor) y su estado público: días sin agua, entregas… */
export async function comunidadesVisibles(ahora = new Date()): Promise<ComunidadVisible[]> {
  const [comunidades, { reportes, entregas }] = await Promise.all([comunidadesConPrioridad(), reportesYEntregas()]);
  const vis = visibilidadPorComunidad(reportes, entregas, ahora);
  return comunidades.map((c) => ({ ...c, vis: vis.get(c.id) ?? VACIA }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ficha pública de una comunidad: prioridad, contador, reportes y entregas (sin datos personales). null si no existe. */
export async function fichaComunidad(id: string, ahora = new Date()) {
  if (!UUID.test(id)) return null;
  const [comunidades, { reportes, entregas }] = await Promise.all([comunidadesVisibles(ahora), reportesYEntregas(id)]);
  const c = comunidades.find((x) => x.id === id);
  if (!c) return null;
  return { comunidad: c, puesto: comunidades.indexOf(c) + 1, total: comunidades.length, reportes, entregas };
}
