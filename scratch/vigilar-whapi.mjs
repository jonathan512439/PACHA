// Vigila en vivo los mensajes de WhatsApp (whapi) y el estado del suscriptor. Uso: node --env-file=../.env vigilar-whapi.mjs [minutos]
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const desde = new Date().toISOString(), fin = Date.now() + Number(process.argv[2] ?? 15) * 60_000;
const hora = (t) => new Date(t).toLocaleTimeString("es-BO", { timeZone: "America/La_Paz" });
console.log(`vigilando desde ${hora(desde)}…`);
const vistos = new Set();
let ultimoEstado = "";
while (Date.now() < fin) {
  const { data: inb } = await db.from("inbound_messages").select("message_id, received_at, uses_ai").eq("channel", "whatsapp").gte("received_at", desde).order("received_at");
  for (const m of inb ?? []) if (!vistos.has(m.message_id)) {
    vistos.add(m.message_id);
    console.log(`${hora(m.received_at)} mensaje ${m.message_id.slice(0, 3)}…${m.uses_ai ? " (IA)" : ""}`);
  }
  const { data: subs } = await db.from("subscribers").select("channel_user_id, estado, community_id, contexto, updated_at").eq("channel", "whatsapp").gte("updated_at", desde);
  for (const s of subs ?? []) {
    const e = `…${s.channel_user_id.slice(-3)} estado=${s.estado} comunidad=${s.community_id ? "sí" : "no"} opciones=${s.contexto?.opcionesWA?.length ?? 0}`;
    if (e !== ultimoEstado) { console.log(`   ${e}`); ultimoEstado = e; }
  }
  await new Promise((r) => setTimeout(r, 3000));
}
console.log(`fin: ${vistos.size} mensaje(s)`);
