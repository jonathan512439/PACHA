// Comprueba en PRODUCCIÓN que el App secret y el WHATSAPP_PHONE_NUMBER_ID de Vercel son correctos, sin enviar
// mensajes reales: manda un aviso firmado de un número ficticio y mira si el bot lo procesó. Limpia al final.
// Uso: node --env-file=../.env verificar-whatsapp-prod.mjs [reintentos]
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim(), SECRETO = (process.env.WHATSAPP_APP_SECRET || "").trim();
const DE = "000000000099", intentos = Number(process.argv[2] ?? 1);
async function probar() {
  const wamid = "wamid.PRUEBA-ID-" + Date.now();
  const cuerpo = JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "x", changes: [{ field: "messages", value: {
    messaging_product: "whatsapp", metadata: { phone_number_id: ID }, messages: [{ from: DE, id: wamid, timestamp: "0", type: "text", text: { body: "hola" } }] } }] }] });
  const r = await fetch("https://pacha-lilac.vercel.app/api/webhooks/whatsapp", { method: "POST", body: cuerpo,
    headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=" + createHmac("sha256", SECRETO).update(cuerpo).digest("hex") } });
  if (r.status !== 200) return { fin: true, msg: `Firma RECHAZADA (HTTP ${r.status}): el App secret de Vercel no coincide` };
  let s = null;
  for (let i = 0; i < 20 && !s; i++) { await new Promise((x) => setTimeout(x, 600)); s = (await db.from("subscribers").select("estado").eq("channel", "whatsapp").eq("channel_user_id", DE).maybeSingle()).data; }
  await db.from("subscribers").delete().eq("channel", "whatsapp").eq("channel_user_id", DE);
  await db.from("inbound_messages").delete().eq("channel", "whatsapp").eq("message_id", "wa:" + wamid);
  return s ? { fin: true, msg: `OK: firma aceptada y Vercel usa el ID ${ID} (el bot procesó el mensaje)` } : { fin: false, msg: "el mensaje se ignoró (Vercel aún no usa ese ID)" };
}
for (let i = 1; i <= intentos; i++) {
  const r = await probar();
  console.log(`intento ${i}: ${r.msg}`);
  if (r.fin) break;
  if (i < intentos) await new Promise((x) => setTimeout(x, 30000));
}
