import { after } from "next/server";
import { manejarMensajeWhapi, mensajesDeWhapi, webhookWhapiValido, type WebhookWhapi } from "@/lib/canales/whapi";

// Webhook de WhatsApp por whapi.cloud. URL: https://<app>/api/webhooks/whapi?k=<WHAPI_WEBHOOK_SECRET>
// (scratch/configurar-whapi.mjs lo registra por API, con la clave también en la cabecera x-pacha-clave).
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!webhookWhapiValido(new URL(request.url), request.headers.get("x-pacha-clave")))
    return new Response("No autorizado", { status: 401 });
  let w: WebhookWhapi;
  try { w = (await request.json()) as WebhookWhapi; } catch { return new Response("ok"); }
  const mensajes = mensajesDeWhapi(w);
  if (mensajes.length) after(async () => { for (const m of mensajes) await manejarMensajeWhapi(m); });
  return new Response("ok"); // 200 enseguida: whapi reintenta ante cualquier otra respuesta
}
