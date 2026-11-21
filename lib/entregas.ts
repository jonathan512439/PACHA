import "server-only";
import type { Canal } from "@/contratos/tipos";
import { db } from "@/lib/supabase";
import { CanalSinEnvio, enviarPorCanal } from "@/lib/canales/enviar";

/*
 * Entregas (cisterna / forraje): las registra el panel y se publican en /entregas.
 * Después de registrar, el bot pregunta "¿Llegó?" (botones ent_si:<id> / ent_no:<id>, ya manejados en procesarMensaje).
 */

export class ErrorEntrega extends Error {
  constructor(mensaje: string, public status = 400) { super(mensaje); }
}

const UNIDAD = { cisterna: "cisternas", forraje: "kg" } as const;
const FOTO_MAX_BYTES = 5 * 1024 * 1024; // límite del bucket 'entregas'
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type NuevaEntrega = {
  communityId: string;
  reportId?: string | null;
  kind: "cisterna" | "forraje";
  quantity: number;
  foto?: { bytes: Uint8Array; mime: string } | null;
};

/**
 * Registra la entrega, marca el reporte como atendido y avisa a la comunidad.
 * La foto debe llegar SIN datos EXIF (el panel la vuelve a codificar con canvas antes de subirla).
 */
export async function registrarEntrega(e: NuevaEntrega, usuario: string) {
  if (!(e.kind in UNIDAD)) throw new ErrorEntrega("Tipo de entrega inválido (cisterna o forraje)");
  if (!Number.isFinite(e.quantity) || e.quantity <= 0) throw new ErrorEntrega("La cantidad debe ser mayor que 0");

  const { data: com } = await db().from("communities").select("id").eq("id", e.communityId).maybeSingle();
  if (!com) throw new ErrorEntrega("La comunidad no existe", 404);
  if (e.reportId) {
    const { data: rep } = await db().from("reports").select("id, community_id, status").eq("id", e.reportId).maybeSingle();
    if (!rep || rep.community_id !== e.communityId) throw new ErrorEntrega("El reporte no es de esa comunidad");
    if (rep.status === "descartado") throw new ErrorEntrega("No se registra una entrega para un reporte descartado");
  }

  let photo_path: string | null = null;
  if (e.foto) {
    const ext = EXT[e.foto.mime];
    if (!ext) throw new ErrorEntrega("La foto debe ser JPG, PNG o WEBP");
    if (e.foto.bytes.length > FOTO_MAX_BYTES) throw new ErrorEntrega("La foto supera 5 MB");
    photo_path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const sub = await db().storage.from("entregas").upload(photo_path, e.foto.bytes, { contentType: e.foto.mime });
    if (sub.error) throw new Error(`No se pudo guardar la foto: ${sub.error.message}`);
  }

  const ins = await db().from("deliveries").insert({
    community_id: e.communityId, report_id: e.reportId ?? null, kind: e.kind, quantity: e.quantity, unit: UNIDAD[e.kind],
    photo_path, is_example: false, registered_by: usuario,
  }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  const id = ins.data.id as string;

  if (e.reportId) await db().from("reports")
    .update({ status: "atendido", attended_at: new Date().toISOString(), updated_by: usuario }).eq("id", e.reportId);

  const notificados = await notificarEntrega(id).catch((err) => { console.error("notificarEntrega", err); return 0; });
  return { id, photo_path, notificados };
}

const texto = (kind: string, quantity: number, comunidad: string) =>
  kind === "cisterna"
    ? `Se registró la entrega de ${quantity} ${quantity === 1 ? "cisterna" : "cisternas"} de agua para ${comunidad}. ¿Llegó?`
    : `Se registró la entrega de ${quantity} kg de forraje para ${comunidad}. ¿Llegó?`;

/**
 * Pregunta "¿Llegó?" con botones. Destinatario: quien hizo el reporte; si la entrega no viene de un reporte,
 * los suscriptores activos de la comunidad. Devuelve cuántos mensajes salieron.
 */
export async function notificarEntrega(deliveryId: string): Promise<number> {
  const { data: d, error } = await db().from("deliveries")
    .select("id, kind, quantity, community_id, report_id, confirmed_by_community, communities(name)").eq("id", deliveryId).single();
  if (error) throw new Error(error.message);
  if (d.confirmed_by_community !== null) return 0;
  const comunidad = (d.communities as unknown as { name: string } | null)?.name ?? "tu comunidad";

  let destinatarios: { channel: Canal; channel_user_id: string }[] = [];
  if (d.report_id) {
    const { data: r } = await db().from("reports").select("subscribers(channel, channel_user_id, activo)").eq("id", d.report_id).single();
    const s = r?.subscribers as unknown as { channel: Canal; channel_user_id: string; activo: boolean } | null;
    if (s?.activo) destinatarios = [s];
  }
  if (destinatarios.length === 0) {
    const { data: subs } = await db().from("subscribers").select("channel, channel_user_id")
      .eq("community_id", d.community_id).eq("activo", true).eq("estado", "listo");
    destinatarios = (subs ?? []) as typeof destinatarios;
  }

  let enviados = 0;
  for (const s of destinatarios) {
    try {
      await enviarPorCanal(s.channel, s.channel_user_id, [{
        tipo: "botones", texto: texto(d.kind as string, Number(d.quantity), comunidad),
        botones: [{ id: `ent_si:${d.id}`, titulo: "✅ Llegó" }, { id: `ent_no:${d.id}`, titulo: "❌ No llegó" }],
      }]);
      enviados++;
    } catch (e) {
      if (!(e instanceof CanalSinEnvio)) console.error("notificarEntrega", s.channel, e);
    }
  }
  return enviados;
}
