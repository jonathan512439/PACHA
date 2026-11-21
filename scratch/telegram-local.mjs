// Desarrollo local SIN URL pública: lee mensajes con getUpdates y los reenvía al webhook local.
// Uso (dentro de /scratch, con `next dev` corriendo y SIN webhook registrado):
//   node --env-file=../.env telegram-local.mjs [http://localhost:3000]
const destino = `${process.argv[2] ?? "http://localhost:3000"}/api/webhooks/telegram`;
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secreto } = process.env;
if (!token || !secreto) throw new Error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET en .env");
let offset = 0;
console.log(`Reenviando mensajes del bot a ${destino} (Ctrl+C para salir)`);
for (;;) {
  const r = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ offset, timeout: 25, allowed_updates: ["message", "callback_query"] }) })).json();
  if (!r.ok) { console.error("getUpdates:", r.description, "(¿hay un webhook registrado? usa telegram-webhook.mjs delete)"); process.exit(1); }
  for (const u of r.result) {
    offset = u.update_id + 1;
    const res = await fetch(destino, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secreto }, body: JSON.stringify(u) });
    console.log(`update ${u.update_id} -> ${res.status}`);
  }
}
