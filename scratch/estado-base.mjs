// Foto del estado de la base para diagnóstico (solo lectura). Uso: node --env-file=../.env estado-base.mjs
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const hora = (t) => new Date(t).toLocaleString("es-BO", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit" });
const mask = (s) => (s && s.length > 4 ? "…" + s.slice(-3) : s);
const [subs, reps, alertas, bols, ents, tarjetas, inb] = await Promise.all([
  db.from("subscribers").select("channel, channel_user_id, estado, activo, updated_at, communities(name)").order("updated_at"),
  db.from("reports").select("status, type, confidence, media_path, transcript, created_at, payload, communities(name)").order("created_at"),
  db.from("alerts").select("id, status, hazard, decision_reason, lesson_id, approved_by, created_at").order("created_at"),
  db.from("bulletins").select("status, source_url, created_at, error"),
  db.from("deliveries").select("kind, quantity, registered_by, confirmed_by_community, is_example, delivered_at, photo_path").eq("is_example", false),
  db.from("lessons").select("id, status, verified_by, audio_ogg_path, card_image_path").order("id"),
  db.from("inbound_messages").select("channel, uses_ai, received_at").order("received_at", { ascending: false }).limit(15),
]);
console.log("== suscriptores"); for (const s of subs.data ?? []) console.log(`  ${s.channel} ${mask(s.channel_user_id)} · ${s.estado} · activo=${s.activo} · ${s.communities?.name ?? "sin comunidad"} · ${hora(s.updated_at)}`);
console.log("== reportes (no ejemplo)"); for (const r of (reps.data ?? []).filter((r) => r.payload?.ejemplo !== true)) console.log(`  ${hora(r.created_at)} · ${r.status} · ${r.type} · ${r.communities?.name} · conf=${r.confidence} · audio=${!!r.media_path} · "${(r.transcript ?? "").slice(0, 70)}"`);
console.log("== alertas"); for (const a of alertas.data ?? []) console.log(`  ${hora(a.created_at)} · ${a.status} · ${a.hazard} · tarjeta=${a.lesson_id} · aprobó=${a.approved_by} · ${a.decision_reason}`);
console.log("== boletines"); for (const b of bols.data ?? []) console.log(`  ${hora(b.created_at)} · ${b.status} · ${b.source_url ? "automático" : "manual"} ${b.error ?? ""}`);
console.log("== entregas reales"); for (const e of ents.data ?? []) console.log(`  ${hora(e.delivered_at)} · ${e.kind} ${e.quantity} · ${e.registered_by} · llegó=${e.confirmed_by_community} · foto=${!!e.photo_path}`);
console.log("== tarjetas"); for (const t of tarjetas.data ?? []) console.log(`  ${t.id} · ${t.status} · verificó=${t.verified_by ?? "-"} · audio=${!!t.audio_ogg_path} · png=${!!t.card_image_path}`);
console.log("== últimos mensajes recibidos"); for (const m of inb.data ?? []) console.log(`  ${hora(m.received_at)} · ${m.channel} · IA=${m.uses_ai}`);
