// Prueba del webhook de WhatsApp con payloads simulados y FIRMADOS (sin número real: sin WHATSAPP_TOKEN las
// llamadas salientes se escriben en el log de `next dev`). El servidor debe tener los mismos valores de prueba:
//   WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN y WHATSAPP_PHONE_NUMBER_ID (ver variables abajo).
// Uso (dentro de /scratch): node --env-file=../.env probar-whatsapp.mjs [base]
// Crea una comunidad "PRUEBA" y un suscriptor de prueba (número ficticio 000000000001), y los borra al final.
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3100";
const SECRETO = process.env.WA_TEST_APP_SECRET ?? "app-secret-de-prueba";
const VERIFY = process.env.WA_TEST_VERIFY_TOKEN ?? "verify-de-prueba";
const PHONE_ID = process.env.WA_TEST_PHONE_ID ?? "100000000000001";
const DE = "000000000001", OTRO = "000000000002";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const res = [];
const ok = (n, c, d = "") => res.push(`${c ? "OK " : "ERR"}  ${n}${d ? ` — ${d}` : ""}`);
let n = Math.floor(Math.random() * 1e6);

const firmar = (cuerpo, secreto = SECRETO) => "sha256=" + createHmac("sha256", secreto).update(cuerpo).digest("hex");
const post = (payload, { secreto = SECRETO, firma = true } = {}) => {
  const cuerpo = JSON.stringify(payload);
  return fetch(`${BASE}/api/webhooks/whatsapp`, { method: "POST", body: cuerpo,
    headers: { "content-type": "application/json", ...(firma ? { "x-hub-signature-256": firmar(cuerpo, secreto) } : {}) } });
};
const envoltura = (mensajes, phoneId = PHONE_ID, extra = {}) => ({ object: "whatsapp_business_account",
  entry: [{ id: "WABA", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: phoneId }, ...(mensajes ? { messages: mensajes } : {}), ...extra } }] }] });
const msg = (cuerpo, de = DE) => ({ from: de, id: `wamid.PRUEBA${++n}`, timestamp: "0", ...cuerpo });
const texto = (t, de) => msg({ type: "text", text: { body: t } }, de);
const boton = (id) => msg({ type: "interactive", interactive: { type: "button_reply", button_reply: { id, title: "x" } } });
const fila = (id) => msg({ type: "interactive", interactive: { type: "list_reply", list_reply: { id, title: "x" } } });
const suscriptor = async (de = DE) => (await db.from("subscribers").select("estado, community_id, activo").eq("channel", "whatsapp").eq("channel_user_id", de).maybeSingle()).data;
async function esperarEstado(estado, ms = 15000) {
  for (const fin = Date.now() + ms; Date.now() < fin; await new Promise((r) => setTimeout(r, 400))) {
    if ((await suscriptor())?.estado === estado) break;
  }
  return suscriptor();
}

const { data: com } = await db.from("communities").insert({
  name: "PRUEBA Kantuta Pampa", municipio: "Toledo", lat: -18.18, lon: -67.41, families: 45, animals: 900,
  main_activity: "camelidos", station_id: "oruro-ciudad", is_example: true,
}).select("id").single();

try {
  let r = await fetch(`${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=12345`);
  ok("1. verificación GET con token correcto -> challenge", r.status === 200 && (await r.text()) === "12345");
  r = await fetch(`${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=12345`);
  ok("   token incorrecto -> 403", r.status === 403);

  ok("2. sin firma -> 401", (await post(envoltura([texto("hola")]), { firma: false })).status === 401);
  ok("   firma con otro secreto -> 401", (await post(envoltura([texto("hola")]), { secreto: "otro-secreto" })).status === 401);

  r = await post(envoltura([texto("hola")]));
  let s = await esperarEstado("esperando_optin");
  ok("3. 'hola' -> 200 y pregunta de suscripción", r.status === 200 && s?.estado === "esperando_optin", s?.estado);

  await post(envoltura([boton("optin:si")]));
  s = await esperarEstado("esperando_comunidad");
  ok("4. botón Sí -> lista de comunidades", s?.estado === "esperando_comunidad", s?.estado);

  await post(envoltura([fila(`com:${com.id}`)]));
  s = await esperarEstado("listo");
  ok("5. elige en la lista -> registrado", s?.estado === "listo" && s?.community_id === com.id, s?.estado);

  const dup = texto("0");
  await post(envoltura([dup])); await post(envoltura([dup])); // Meta reintenta con el mismo wamid
  await post(envoltura(null, PHONE_ID, { statuses: [{ id: "wamid.x", status: "delivered" }] }));
  await post(envoltura([texto("hola", OTRO)], "999999999999999")); // otro número de empresa
  await post(envoltura([msg({ type: "image", image: { id: "img1" } })]));
  await new Promise((r2) => setTimeout(r2, 2500));
  const { count } = await db.from("inbound_messages").select("*", { count: "exact", head: true }).eq("channel", "whatsapp").eq("message_id", `wa:${dup.id}`);
  ok("6. mensaje repetido -> se procesa una sola vez", count === 1, `registros: ${count}`);
  ok("7. mensaje para otro phone_number_id -> ignorado", !(await suscriptor(OTRO)));

  await post(envoltura([texto("BAJA")]));
  s = await esperarEstado("baja");
  ok("8. BAJA -> baja", s?.estado === "baja" && s?.activo === false, s?.estado);
} finally {
  await db.from("subscribers").delete().eq("channel", "whatsapp").in("channel_user_id", [DE, OTRO]);
  await db.from("inbound_messages").delete().eq("channel", "whatsapp").like("message_id", "wa:wamid.PRUEBA%");
  await db.from("communities").delete().eq("id", com.id);
  res.push(!(await suscriptor()) ? "OK   limpieza" : "ERR  limpieza: quedó el suscriptor de prueba");
  console.log(res.join(String.fromCharCode(10)));
}
