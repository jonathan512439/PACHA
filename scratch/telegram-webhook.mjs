// Gestiona el webhook del bot de Telegram. Uso (dentro de /scratch):
//   node --env-file=../.env telegram-webhook.mjs info
//   node --env-file=../.env telegram-webhook.mjs set https://<tu-app>.vercel.app
//   node --env-file=../.env telegram-webhook.mjs delete      (necesario para usar telegram-local.mjs)
// Requiere TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET en .env (el mismo secreto en Vercel).
const [accion = "info", base] = process.argv.slice(2);
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secreto } = process.env;
if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN en .env");
const api = async (m, b = {}) => (await fetch(`https://api.telegram.org/bot${token}/${m}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })).json();

if (accion === "set") {
  if (!base?.startsWith("https://")) throw new Error("Pasa la URL pública https de la app");
  if (!secreto || !/^[A-Za-z0-9_-]{16,256}$/.test(secreto)) throw new Error("TELEGRAM_WEBHOOK_SECRET: 16 a 256 caracteres A-Z a-z 0-9 _ -");
  console.log(await api("setWebhook", {
    url: `${base.replace(/\/$/, "")}/api/webhooks/telegram`, secret_token: secreto,
    allowed_updates: ["message", "callback_query"], drop_pending_updates: true,
  }));
  console.log(await api("setMyCommands", { commands: [
    { command: "start", description: "Empezar / ver el menú" },
    { command: "menu", description: "Qué hacer ante helada, sequía o nevada" },
    { command: "baja", description: "Dejar de recibir avisos" },
  ] }));
} else if (accion === "delete") {
  console.log(await api("deleteWebhook", { drop_pending_updates: false }));
}
const info = await api("getWebhookInfo");
const me = await api("getMe");
console.log({ bot: me.result?.username, url: info.result?.url || "(sin webhook)", pendientes: info.result?.pending_update_count, ultimo_error: info.result?.last_error_message });
