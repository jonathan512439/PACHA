import "server-only";
import { db } from "@/lib/supabase";
import { prioridadComunidad, type PrioridadComunidad, type ReporteParaPrioridad } from "@/contratos/prioridad";

/*
 * Consultas para las páginas (públicas y del panel). NUNCA devuelve teléfonos ni datos de suscriptores.
 * Las transcripciones solo salen en las funciones del panel (marcadas "panel").
 */

export type ComunidadMapa = {
  id: string; name: string; municipio: string; lat: number; lon: number; families: number; animals: number;
  is_example: boolean; is_test: boolean; prioridad: PrioridadComunidad;
};

type FilaReporte = { id: string; community_id: string; status: string; confirmed_at: string | null; created_at: string; payload: Record<string, unknown> };

const aParaPrioridad = (r: FilaReporte): ReporteParaPrioridad => ({
  id: r.id,
  status: r.status as ReporteParaPrioridad["status"],
  confirmedAt: r.confirmed_at ? new Date(r.confirmed_at) : null,
  createdAt: new Date(r.created_at),
  diasSinRecurso: (r.payload?.dias_sin_recurso as number | null) ?? null,
  familias: (r.payload?.familias_afectadas as number | null) ?? null,
  animales: (r.payload?.animales_afectados as number | null) ?? null,
});

/** Comunidades con su prioridad recalculada AHORA (la espera cuenta), ordenadas de mayor a menor. */
export async function comunidadesConPrioridad(): Promise<ComunidadMapa[]> {
  const [{ data: coms, error: e1 }, { data: reps, error: e2 }] = await Promise.all([
    db().from("communities").select("id, name, municipio, lat, lon, families, animals, is_example, is_test"),
    db().from("reports").select("id, community_id, status, confirmed_at, created_at, payload").eq("status", "confirmado"),
  ]);
  if (e1 || e2) throw new Error((e1 ?? e2)!.message);
  const porComunidad = new Map<string, FilaReporte[]>();
  for (const r of (reps ?? []) as FilaReporte[]) porComunidad.set(r.community_id, [...(porComunidad.get(r.community_id) ?? []), r]);
  const ahora = new Date();
  return (coms ?? [])
    .map((c) => ({ ...c, prioridad: prioridadComunidad((porComunidad.get(c.id) ?? []).map(aParaPrioridad), c, ahora) }) as ComunidadMapa)
    .sort((a, b) => puntaje(b) - puntaje(a) || a.name.localeCompare(b.name));
}
export const puntaje = (c: ComunidadMapa) => (c.prioridad.estado === "activa" ? c.prioridad.resultado.score : -1);

export type AlertaPublica = {
  id: string; hazard: string; zona: string | null; risk_level: string | null; cita_evento: string; cita_riesgo: string | null;
  valid_from: string; valid_to: string; sent_at: string | null; message_text: string; lesson_id: string | null;
};

/** Última alerta ENVIADA (la que se muestra en el mapa). */
export async function alertaActiva(): Promise<AlertaPublica | null> {
  const { data, error } = await db().from("alerts")
    .select("id, hazard, zona, risk_level, cita_evento, cita_riesgo, valid_from, valid_to, sent_at, message_text, lesson_id")
    .eq("status", "enviada").order("sent_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data as AlertaPublica | null;
}

export async function alertaPorId(id: string): Promise<AlertaPublica | null> {
  const { data } = await db().from("alerts")
    .select("id, hazard, zona, risk_level, cita_evento, cita_riesgo, valid_from, valid_to, sent_at, message_text, lesson_id")
    .eq("id", id).in("status", ["enviada"]).maybeSingle();
  return data as AlertaPublica | null;
}

export type EntregaPublica = {
  id: string; kind: string; quantity: number; unit: string; delivered_at: string; is_example: boolean;
  confirmed_by_community: boolean | null; fotoUrl: string | null; comunidad: string; prioridadOrigen: number | null;
};

export async function entregasPublicas(): Promise<EntregaPublica[]> {
  const { data, error } = await db().from("deliveries")
    .select("id, kind, quantity, unit, delivered_at, is_example, confirmed_by_community, photo_path, communities(name), reports(priority_score)")
    .order("delivered_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({
    id: d.id as string, kind: d.kind as string, quantity: Number(d.quantity), unit: d.unit as string,
    delivered_at: d.delivered_at as string, is_example: d.is_example as boolean,
    confirmed_by_community: d.confirmed_by_community as boolean | null,
    fotoUrl: d.photo_path ? db().storage.from("entregas").getPublicUrl(d.photo_path as string).data.publicUrl : null,
    comunidad: (d.communities as unknown as { name: string } | null)?.name ?? "—",
    prioridadOrigen: (d.reports as unknown as { priority_score: number | null } | null)?.priority_score ?? null,
  }));
}

/* ------------------------------- Panel -------------------------------- */

export type ReportePanel = {
  id: string; status: string; type: string; transcript: string | null; confidence: number | null; factor: string | null;
  priority_score: number | null; created_at: string; community_id: string; comunidad: string; media_path: string | null;
  payload: Record<string, unknown>; audioUrl: string | null; canal: string | null; esEjemplo: boolean;
};

/** panel: reportes con transcripción y audio (URL firmada de 10 min: el bucket 'reportes' es privado). */
export async function reportesPanel(): Promise<ReportePanel[]> {
  const { data, error } = await db().from("reports")
    .select("id, status, type, transcript, confidence, factor, priority_score, created_at, community_id, media_path, payload, communities(name), subscribers(channel)")
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  const rutas = (data ?? []).map((r) => r.media_path as string | null).filter((x): x is string => !!x);
  const firmadas = rutas.length ? (await db().storage.from("reportes").createSignedUrls(rutas, 600)).data ?? [] : [];
  const url = new Map(firmadas.map((f) => [f.path, f.signedUrl]));
  return (data ?? []).map((r) => ({
    ...(r as unknown as ReportePanel),
    comunidad: (r.communities as unknown as { name: string } | null)?.name ?? "—",
    canal: (r.subscribers as unknown as { channel: string } | null)?.channel ?? null,
    audioUrl: r.media_path ? url.get(r.media_path as string) ?? null : null,
    esEjemplo: (r.payload as Record<string, unknown>)?.ejemplo === true,
  }));
}

export type AlertaPanel = AlertaPublica & {
  status: string; decision_reason: string; approved_by: string | null; approved_at: string | null; created_at: string;
  min_temp_c: number | null; senamhi_level: string | null;
  boletin: { source_url: string | null; pdfUrl: string | null; extracted: Record<string, unknown> | null } | null;
  envios: { enviado: number; fallido: number };
};

export async function alertasPanel(): Promise<AlertaPanel[]> {
  const { data, error } = await db().from("alerts")
    .select("*, bulletins(source_url, pdf_path, extracted), alert_deliveries(status)")
    .order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => {
    const b = a.bulletins as { source_url: string | null; pdf_path: string; extracted: Record<string, unknown> | null } | null;
    const envios = ((a.alert_deliveries ?? []) as { status: string }[]).reduce(
      (acc, d) => ({ ...acc, [d.status]: (acc[d.status as "enviado" | "fallido"] ?? 0) + 1 }), { enviado: 0, fallido: 0 });
    return {
      ...(a as unknown as AlertaPanel),
      boletin: b ? { source_url: b.source_url, extracted: b.extracted,
        pdfUrl: b.pdf_path ? db().storage.from("boletines").getPublicUrl(b.pdf_path).data.publicUrl : null } : null,
      envios,
    };
  });
}

export async function resumenPanel() {
  const contar = async (tabla: string, filtro?: [string, string]) => {
    let q = db().from(tabla).select("*", { count: "exact", head: true });
    if (filtro) q = q.eq(filtro[0], filtro[1]);
    return (await q).count ?? 0;
  };
  const [confirmados, revisar, atendidos, suscriptores, borradores] = await Promise.all([
    contar("reports", ["status", "confirmado"]), contar("reports", ["status", "revisar"]), contar("reports", ["status", "atendido"]),
    contar("subscribers", ["activo", "true"]), contar("alerts", ["status", "borrador"]),
  ]);
  return { confirmados, revisar, atendidos, suscriptores, borradores };
}
