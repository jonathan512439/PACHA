// Vigila la base en vivo: avisa cuando llega un mensaje de WhatsApp al servidor (y qué hizo el bot). Máx. N minutos.
// Uso: node --env-file=../.env vigilar-whatsapp.mjs [minutos]
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const desde = new Date().toISOString(), fin = Date.now() + Number(process.argv[2] ?? 5) * 60_000;
const hora = (t) => new Date(t).toLocaleTimeString("es-BO", { timeZone: "America/La_Paz" });
console.log(`vigilando desde ${hora(desde)}…`);
let visto = false;
while (Date.now() < fin) {
  const { data: inb } = await db.from("inbound_messages").select("message_id, received_at").eq("channel", "whatsapp").gte("received_at", desde);
  if (inb?.length) {
    if (!visto) { console.log(`✔ LLEGÓ al servidor: ${inb.length} mensaje(s) de WhatsApp (${hora(inb[0].received_at)})`); visto = true; }
    await new Promise((r) => setTimeout(r, 4000)); // dar tiempo al bot a procesar
    const { data: subs } = await db.from("subscribers").select("channel_user_id, estado, updated_at").eq("channel", "whatsapp").gte("updated_at", desde);
    console.log(subs?.length ? `✔ el bot lo procesó: suscriptor …${subs[0].channel_user_id.slice(-3)} en estado "${subs[0].estado}"` : "⚠ llegó pero el bot no registró al suscriptor (error de procesamiento)");
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
console.log("✖ en el tiempo vigilado NO llegó ningún mensaje de WhatsApp al servidor: Meta no está llamando al webhook.");
