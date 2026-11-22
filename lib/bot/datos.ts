import "server-only";
import { db } from "@/lib/supabase";
import type { Canal } from "@/contratos/tipos";
import { estadosPublicables, permitirBorrador } from "@/lib/tarjeta-publica";

/* Acceso a datos del bot. Todo pasa por el servidor con la clave secreta (lib/supabase.ts). */

export type Contexto = {
  reportePendiente?: string;          // reporte esperando elección de comunidad
  fallosConfianza?: number;           // mensajes seguidos con confianza baja
  ventana?: { inicio: number; n: number }; // límite de mensajes por usuario
};
export type Suscriptor = {
  id: string;
  community_id: string | null;
  channel: Canal;
  channel_user_id: string;
  estado: string;
  contexto: Contexto;
  activo: boolean;
};
export type Comunidad = { id: string; name: string; families: number; animals: number; is_test: boolean };
export type Reporte = {
  id: string; community_id: string; subscriber_id: string | null; type: string; status: string;
  payload: Record<string, unknown>; transcript: string | null; confidence: number | null; factor: string | null;
};

const falla = (que: string, e: { message: string } | null) => {
  if (e) throw new Error(`${que}: ${e.message}`);
};

/** Registra el mensaje entrante. Devuelve false si ya se había recibido (reintento del canal). */
export async function registrarEntrante(canal: Canal, mensajeId: string): Promise<boolean> {
  const { error } = await db().from("inbound_messages").insert({ channel: canal, message_id: mensajeId });
  if (error?.code === "23505") return false; // duplicado
  falla("registrar mensaje", error);
  return true;
}

export async function marcarUsoIA(canal: Canal, mensajeId: string) {
  const { error } = await db().from("inbound_messages").update({ uses_ai: true }).eq("channel", canal).eq("message_id", mensajeId);
  falla("marcar uso de IA", error);
}

/** Inicio del día en Bolivia (UTC-4, sin horario de verano). */
function inicioDiaLaPaz(ahora = Date.now()): Date {
  const offset = 4 * 3_600_000;
  const local = new Date(ahora - offset);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + offset);
}

/** Llamadas a Gemini hechas hoy desde los canales públicos (web y Telegram), para el tope diario. */
export async function usoIAHoyCanalesPublicos(): Promise<number> {
  const { count, error } = await db()
    .from("inbound_messages")
    .select("*", { count: "exact", head: true })
    .eq("uses_ai", true)
    .in("channel", ["web", "telegram"])
    .gte("received_at", inicioDiaLaPaz().toISOString());
  falla("contar uso de IA", error);
  return count ?? 0;
}

export async function obtenerOCrearSuscriptor(canal: Canal, usuarioId: string): Promise<{ s: Suscriptor; nuevo: boolean }> {
  const columnas = "id, community_id, channel, channel_user_id, estado, contexto, activo";
  const buscar = () =>
    db().from("subscribers").select(columnas).eq("channel", canal).eq("channel_user_id", usuarioId).maybeSingle();
  const { data, error } = await buscar();
  falla("buscar suscriptor", error);
  if (data) return { s: data as Suscriptor, nuevo: false };
  const ins = await db().from("subscribers").insert({ channel: canal, channel_user_id: usuarioId, estado: "nuevo" }).select(columnas).single();
  if (ins.error?.code === "23505") { // dos mensajes simultáneos del mismo usuario
    const otra = await buscar();
    falla("buscar suscriptor", otra.error);
    return { s: otra.data as Suscriptor, nuevo: false };
  }
  falla("crear suscriptor", ins.error);
  return { s: ins.data as Suscriptor, nuevo: true };
}

export async function actualizarSuscriptor(id: string, cambios: Partial<Omit<Suscriptor, "id">>) {
  const { error } = await db()
    .from("subscribers")
    .update({ ...cambios, updated_at: new Date().toISOString(), last_inbound_at: new Date().toISOString() })
    .eq("id", id);
  falla("actualizar suscriptor", error);
}

/** Comunidades para la lista de registro (máximo 10: límite de las listas de WhatsApp). */
export async function comunidades(): Promise<Comunidad[]> {
  const { data, error } = await db()
    .from("communities").select("id, name, families, animals, is_test").order("is_test").order("name").limit(10);
  falla("leer comunidades", error);
  return (data ?? []) as Comunidad[];
}

export async function comunidad(id: string): Promise<Comunidad | null> {
  const { data, error } = await db().from("communities").select("id, name, families, animals, is_test").eq("id", id).maybeSingle();
  falla("leer comunidad", error);
  return data as Comunidad | null;
}

/** Amenaza a la que pertenece cada factor (para elegir la tarjeta "durante" de esa amenaza). */
const AMENAZA_DE_FACTOR: Record<string, string> = {
  sin_agua_consumo: "sequia", pozo_o_vertiente_seca: "sequia", sin_reserva_forraje: "sequia",
  cultivos_sin_proteccion_helada: "helada", perdida_por_helada: "helada", animales_sin_abrigo: "helada",
  perdida_por_nevada: "nevada", camino_cortado: "nevada",
};
const ORDEN_FASE: Record<string, number> = { durante: 0, antes_animales: 1, antes_familia: 2, despues: 3 };

/**
 * Tarjeta para un reporte confirmado (regla fija, sin IA). Un reporte describe algo que YA está pasando:
 *   1) fase "durante" con ese factor · 2) fase "durante" de la amenaza del factor · 3) cualquier fase con ese factor.
 * Ej.: "la vertiente está seca" (pozo_o_vertiente_seca) -> sequia-durante-01, no "Guarda agua ANTES de la sequía".
 * La tarjeta en sí la arma lib/tarjetas.salidaTarjeta (regla de publicación y etiquetas).
 */
export async function idTarjetaPorFactor(factor: string): Promise<string | null> {
  const { data, error } = await db()
    .from("lessons").select("id, hazard, phase, factor_tags").in("status", [...estadosPublicables(permitirBorrador())]);
  falla("buscar tarjeta por factor", error);
  const todas = (data ?? []) as { id: string; hazard: string; phase: string; factor_tags: string[] }[];
  const porOrden = (a: { id: string; phase: string }, b: { id: string; phase: string }) =>
    (ORDEN_FASE[a.phase] ?? 9) - (ORDEN_FASE[b.phase] ?? 9) || a.id.localeCompare(b.id);
  const conFactor = todas.filter((t) => t.factor_tags?.includes(factor)).sort(porOrden);
  const durante = conFactor.find((t) => t.phase === "durante")
    ?? todas.filter((t) => t.phase === "durante" && t.hazard === AMENAZA_DE_FACTOR[factor]).sort(porOrden)[0];
  return (durante ?? conFactor[0])?.id ?? null;
}

export async function crearReporte(r: Omit<Reporte, "id"> & { media_path?: string | null }): Promise<Reporte> {
  const { data, error } = await db().from("reports").insert(r).select("*").single();
  falla("crear reporte", error);
  return data as Reporte;
}

/** Reporte de ESE suscriptor (nunca de otro: los ids viajan en botones). */
export async function reporteDe(id: string, subscriberId: string): Promise<Reporte | null> {
  const { data, error } = await db().from("reports").select("*").eq("id", id).eq("subscriber_id", subscriberId).maybeSingle();
  falla("leer reporte", error);
  return data as Reporte | null;
}

export async function actualizarReporte(id: string, cambios: Record<string, unknown>) {
  const { error } = await db().from("reports").update(cambios).eq("id", id);
  falla("actualizar reporte", error);
}

/** Guarda el audio de un reporte en el bucket PRIVADO 'reportes'. Devuelve la ruta. */
export async function guardarAudioReporte(subscriberId: string, mensajeId: string, audio: { base64: string; mime: string }) {
  const ext = /ogg|opus/.test(audio.mime) ? "ogg" : /webm/.test(audio.mime) ? "webm" : /wav/.test(audio.mime) ? "wav"
    : /mp4|m4a|aac/.test(audio.mime) ? "m4a" : /mpeg|mp3/.test(audio.mime) ? "mp3" : "bin";
  const ruta = `${subscriberId}/${mensajeId.replace(/[^A-Za-z0-9_-]/g, "_")}.${ext}`;
  const { error } = await db().storage.from("reportes").upload(ruta, Buffer.from(audio.base64, "base64"), { contentType: audio.mime, upsert: true });
  falla("guardar audio", error);
  return ruta;
}

/** Confirmación de entrega por la comunidad. Solo si la entrega es de SU comunidad y aún no respondió. */
export async function confirmarEntrega(id: string, communityId: string, llego: boolean): Promise<boolean> {
  const { data, error } = await db()
    .from("deliveries").update({ confirmed_by_community: llego, confirmed_at: new Date().toISOString() })
    .eq("id", id).eq("community_id", communityId).is("confirmed_by_community", null).select("id");
  falla("confirmar entrega", error);
  return (data ?? []).length > 0;
}

export type MiReporte = {
  id: string; type: string; status: string; created_at: string; comunidadId: string; comunidad: string;
  entrega: { id: string; kind: string; quantity: number; unit: string; delivered_at: string; confirmed_by_community: boolean | null } | null;
};

/** Últimos reportes de ESE suscriptor (sin los descartados), con su entrega más reciente si la hay. */
export async function reportesDelSuscriptor(subscriberId: string, limite = 3): Promise<MiReporte[]> {
  const { data, error } = await db().from("reports")
    .select("id, type, status, created_at, community_id, communities(name), deliveries(id, kind, quantity, unit, delivered_at, confirmed_by_community, is_example)")
    .eq("subscriber_id", subscriberId).neq("status", "descartado")
    .order("created_at", { ascending: false }).limit(limite);
  falla("leer mis reportes", error);
  type Entrega = NonNullable<MiReporte["entrega"]> & { is_example: boolean };
  type Fila = { id: string; type: string; status: string; created_at: string; community_id: string;
    communities: { name: string } | null; deliveries: Entrega[] | null };
  return ((data ?? []) as unknown as Fila[]).map((r) => {
    const e = (r.deliveries ?? []).filter((d) => !d.is_example).sort((a, b) => b.delivered_at.localeCompare(a.delivered_at))[0];
    return {
      id: r.id, type: r.type, status: r.status, created_at: r.created_at, comunidadId: r.community_id,
      comunidad: r.communities?.name ?? "tu comunidad",
      entrega: e ? { id: e.id, kind: e.kind, quantity: Number(e.quantity), unit: e.unit, delivered_at: e.delivered_at, confirmed_by_community: e.confirmed_by_community } : null,
    };
  });
}

export const urlPublica = (bucket: string, ruta: string) => db().storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
