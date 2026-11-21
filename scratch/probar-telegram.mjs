// Prueba del webhook de Telegram con updates simulados (sin bot real: sin TELEGRAM_BOT_TOKEN las llamadas
// salientes se escriben en el log de `next dev`). Requiere `next dev` con TELEGRAM_WEBHOOK_SECRET definido.
// Uso (dentro de /scratch): TELEGRAM_WEBHOOK_SECRET=<mismo que el servidor> node --env-file=../.env probar-telegram.mjs [base]
// Crea una comunidad "PRUEBA" y un suscriptor de prueba, y los borra al final.
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3100";
const SECRETO = process.env.TELEGRAM_WEBHOOK_SECRET;
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CHAT = 999000111, GRUPO = -100999000111;
const res = [];
const ok = (n, c, d = "") => res.push(`${c ? "OK " : "ERR"}  ${n}${d ? ` — ${d}` : ""}`);
let uid = 990000 + Math.floor(Math.random() * 9000);

const post = (update, secreto = SECRETO) => fetch(`${BASE}/api/webhooks/telegram`, {
  method: "POST", headers: { "content-type": "application/json", ...(secreto ? { "x-telegram-bot-api-secret-token": secreto } : {}) },
  body: JSON.stringify(update),
});
const texto = (t, chat = CHAT, type = "private") => ({ update_id: ++uid, message: { message_id: uid, chat: { id: chat, type }, text: t } });
const boton = (data) => ({ update_id: ++uid, callback_query: { id: `cb${uid}`, data, message: { chat: { id: CHAT, type: "private" } } } });
const suscriptor = async (chat = CHAT) => (await db.from("subscribers").select("estado, community_id, activo").eq("channel", "telegram").eq("channel_user_id", String(chat)).maybeSingle()).data;
async function esperarEstado(estado, ms = 15000) { // after() procesa en segundo plano: se espera el efecto en la base
  for (const fin = Date.now() + ms; Date.now() < fin; await new Promise((r) => setTimeout(r, 400))) {
    const s = await suscriptor();
    if (s?.estado === estado) return s;
  }
  return await suscriptor();
}

const { data: com } = await db.from("communities").insert({
  name: "PRUEBA Kantuta Pampa", municipio: "Toledo", lat: -18.18, lon: -67.41, families: 45, animals: 900,
  main_activity: "camelidos", station_id: "oruro-ciudad", is_example: true,
}).select("id").single();

try {
  ok("1. sin secreto -> 401", (await post(texto("hola"), null)).status === 401);
  ok("   secreto incorrecto -> 401", (await post(texto("hola"), "secreto-equivocado-000000")).status === 401);

  let r = await post(texto("/start"));
  let s = await esperarEstado("esperando_optin");
  ok("2. /start -> 200 y pregunta de suscripción", r.status === 200 && s?.estado === "esperando_optin", s?.estado);

  await post(boton("optin:si"));
  s = await esperarEstado("esperando_comunidad");
  ok("3. botón Sí -> lista de comunidades", s?.estado === "esperando_comunidad", s?.estado);

  await post(boton(`com:${com.id}`));
  s = await esperarEstado("listo");
  ok("4. elige comunidad -> registrado", s?.estado === "listo" && s?.community_id === com.id, s?.estado);

  const dup = texto("/menu");
  await post(dup); await post(dup); // Telegram reintenta con el mismo update_id
  await new Promise((r) => setTimeout(r, 2500));
  const { count } = await db.from("inbound_messages").select("*", { count: "exact", head: true }).eq("channel", "telegram").eq("message_id", `tg:${dup.update_id}`);
  ok("5. update repetido -> se procesa una sola vez", count === 1, `registros: ${count}`);

  await post(boton("menu:agua:ahora"));
  await post({ update_id: ++uid, message: { message_id: uid, chat: { id: CHAT, type: "private" }, photo: [{ file_id: "x" }] } });
  await post(texto("hola desde un grupo", GRUPO, "supergroup"));
  await new Promise((r) => setTimeout(r, 2500));
  ok("6. mensaje de grupo -> ignorado", !(await suscriptor(GRUPO)));

  await post(texto("/baja"));
  s = await esperarEstado("baja");
  ok("7. /baja -> baja", s?.estado === "baja" && s?.activo === false, s?.estado);
} finally {
  await db.from("subscribers").delete().eq("channel", "telegram").in("channel_user_id", [String(CHAT), String(GRUPO)]);
  await db.from("inbound_messages").delete().eq("channel", "telegram").like("message_id", "tg:99%");
  await db.from("communities").delete().eq("id", com.id);
  const quedan = await suscriptor();
  res.push(!quedan ? "OK   limpieza" : "ERR  limpieza: quedó el suscriptor de prueba");
  console.log(res.join(String.fromCharCode(10)));
}
