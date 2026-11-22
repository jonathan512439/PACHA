// Registra el webhook de PACHA en el canal de whapi.cloud y activa la descarga automática de audios.
// Uso (desde scratch/): node --env-file=../.env configurar-whapi.mjs
// Necesita WHAPI_TOKEN y WHAPI_WEBHOOK_SECRET en el .env. No imprime secretos.
const TOKEN = (process.env.WHAPI_TOKEN || "").trim();
const CLAVE = (process.env.WHAPI_WEBHOOK_SECRET || "").trim();
const APP = (process.env.APP_URL || "https://pacha-lilac.vercel.app").trim().replace(/\/$/, "");
const API = (process.env.WHAPI_API_URL || "https://gate.whapi.cloud").trim().replace(/\/$/, "");
if (!TOKEN || !CLAVE) { console.error("Faltan WHAPI_TOKEN o WHAPI_WEBHOOK_SECRET en el .env"); process.exit(1); }

const h = { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", accept: "application/json" };

const salud = await fetch(`${API}/health`, { headers: h });
const s = await salud.json().catch(() => ({}));
console.log("canal:", salud.status, s?.status?.text ?? s?.status ?? "", s?.user?.id ? `número …${String(s.user.id).slice(-3)}` : "");

const cuerpo = {
  webhooks: [{
    url: `${APP}/api/webhooks/whapi?k=${encodeURIComponent(CLAVE)}`,
    events: [{ type: "messages", method: "post" }],
    mode: "body",
    headers: { "x-pacha-clave": CLAVE },
  }],
  media: { auto_download: ["voice", "audio"] },
};
const r = await fetch(`${API}/settings`, { method: "PATCH", headers: h, body: JSON.stringify(cuerpo) });
console.log("settings:", r.status, r.ok ? "webhook registrado" : await r.text());

const ver = await fetch(`${API}/settings`, { headers: h });
const v = await ver.json().catch(() => ({}));
console.log("webhooks:", (v.webhooks ?? []).map((w) => `${w.url.replace(/k=[^&]+/, "k=***")} ${JSON.stringify(w.events)}`));
console.log("auto_download:", v.media?.auto_download);
