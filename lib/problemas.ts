import "server-only";
import type { Canal, SalidaBot } from "@/contratos/tipos";
import { db } from "@/lib/supabase";
import { idTarjetaPorFactor } from "@/lib/bot/datos";
import { salidaTarjeta } from "@/lib/tarjetas";
import { CanalSinEnvio, enviarPorCanal } from "@/lib/canales/enviar";
import { agruparProblemas, type FilaReporteProblema, type Problema } from "@/lib/problemas-agrupar";

/*
 * Problemas activos (panel): reportes 'confirmado' agrupados por factor, con la tarjeta "durante" que
 * corresponde (misma regla que el bot) y los envíos de las últimas 24 h. Desde aquí la técnica envía
 * esa tarjeta a todas las comunidades con ese problema. Solo tarjetas publicables; nunca se redacta nada.
 */

export const HORAS_SIN_REPETIR = 24;
export class ErrorProblema extends Error {}

export type EnvioReciente = { community_id: string; sent_by: string; sent_at: string; recipients: number };
export type ProblemaPanel = Problema & {
  tarjeta: { id: string; titulo: string } | null;   // null = no hay tarjeta publicable para ese factor
  enviosRecientes: EnvioReciente[];
  pendientes: string[];                            // comunidades que aún no recibieron la tarjeta en 24 h
};

type Fila = {
  community_id: string; factor: string | null; confirmed_at: string | null; created_at: string;
  payload: Record<string, unknown>; communities: { name: string; families: number } | null;
};

/** Devuelve también si falta aplicar la migración de lesson_sends (para avisarlo en el panel). */
export async function problemasActivos(): Promise<{ problemas: ProblemaPanel[]; migracionPendiente: boolean }> {
  const { data, error } = await db().from("reports")
    .select("community_id, factor, confirmed_at, created_at, payload, communities(name, families)")
    .eq("status", "confirmado");
  if (error) throw new Error(error.message);
  const filas: FilaReporteProblema[] = ((data ?? []) as unknown as Fila[]).map((r) => ({
    community_id: r.community_id, comunidad: r.communities?.name ?? "—", familiasComunidad: r.communities?.families ?? 0,
    factor: r.factor, confirmed_at: r.confirmed_at, created_at: r.created_at,
    familias: (r.payload?.familias_afectadas as number | null) ?? null, dias: (r.payload?.dias_sin_recurso as number | null) ?? null,
  }));
  const grupos = agruparProblemas(filas);

  const desde = new Date(Date.now() - HORAS_SIN_REPETIR * 3_600_000).toISOString();
  const envios = await db().from("lesson_sends").select("factor, community_id, sent_by, sent_at, recipients").gte("sent_at", desde);
  const migracionPendiente = !!envios.error;
  const recientes = (envios.data ?? []) as (EnvioReciente & { factor: string })[];

  const problemas = await Promise.all(grupos.map(async (p): Promise<ProblemaPanel> => {
    const id = p.factor === "otro" ? null : await idTarjetaPorFactor(p.factor);
    const salida = id ? await salidaTarjeta(id) : null;
    const enviosRecientes = recientes.filter((e) => e.factor === p.factor && p.comunidades.some((c) => c.id === e.community_id));
    const yaRecibieron = new Set(enviosRecientes.map((e) => e.community_id));
    return {
      ...p,
      tarjeta: salida && salida.tipo === "tarjeta" ? { id: salida.id, titulo: salida.titulo } : null,
      enviosRecientes,
      pendientes: p.comunidades.filter((c) => !yaRecibieron.has(c.id)).map((c) => c.id),
    };
  }));
  return { problemas, migracionPendiente };
}

/** Envía la tarjeta del factor a los suscriptores activos de las comunidades que aún no la recibieron (24 h). */
export async function enviarTarjetaProblema(factor: string, usuario: string) {
  const { problemas, migracionPendiente } = await problemasActivos();
  if (migracionPendiente) throw new ErrorProblema("Falta aplicar la migración 2026-11-22_lesson_sends.sql en Supabase.");
  const p = problemas.find((x) => x.factor === factor);
  if (!p) throw new ErrorProblema("Ese problema ya no tiene reportes confirmados.");
  if (!p.tarjeta) throw new ErrorProblema("No hay una tarjeta verificada para este problema.");
  if (!p.pendientes.length) throw new ErrorProblema(`Todas estas comunidades ya la recibieron en las últimas ${HORAS_SIN_REPETIR} h.`);
  const tarjeta = await salidaTarjeta(p.tarjeta.id);
  if (!tarjeta) throw new ErrorProblema("La tarjeta dejó de estar publicable.");

  const { data: subs, error } = await db().from("subscribers")
    .select("id, channel, channel_user_id, community_id")
    .eq("activo", true).eq("estado", "listo").in("community_id", p.pendientes);
  if (error) throw new Error(error.message);

  const n = p.comunidades.length;
  const intro = n > 1
    ? `${n} comunidades de la zona reportan: ${p.etiqueta.toLowerCase()}. Esta recomendación verificada puede ayudar:`
    : `Tu comunidad reportó: ${p.etiqueta.toLowerCase()}. Esta recomendación verificada puede ayudar:`;
  const salidas: SalidaBot[] = [{ tipo: "texto", texto: intro }, tarjeta];

  const porComunidad = new Map<string, number>(p.pendientes.map((id) => [id, 0]));
  const r = { enviados: 0, fallidos: 0, omitidosWeb: 0, comunidades: p.pendientes.length, errores: [] as string[] };
  for (const s of (subs ?? []) as { channel: Canal; channel_user_id: string; community_id: string }[]) {
    try {
      await enviarPorCanal(s.channel, s.channel_user_id, salidas);
      r.enviados++;
      porComunidad.set(s.community_id, (porComunidad.get(s.community_id) ?? 0) + 1);
    } catch (e) {
      if (e instanceof CanalSinEnvio) { r.omitidosWeb++; continue; }
      r.fallidos++;
      r.errores.push(e instanceof Error ? e.message : String(e));
    }
  }
  // Se registra por comunidad aunque no tenga suscriptores con canal de envío: así no se repite en 24 h
  // y queda constancia pública de que la técnica respondió a ese problema.
  const ins = await db().from("lesson_sends").insert([...porComunidad].map(([community_id, recipients]) => ({
    factor, lesson_id: p.tarjeta!.id, community_id, recipients, sent_by: usuario,
  })));
  if (ins.error) throw new Error(ins.error.message);
  return { ...r, tarjeta: p.tarjeta, etiqueta: p.etiqueta };
}
