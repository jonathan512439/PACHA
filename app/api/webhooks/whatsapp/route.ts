import { after } from "next/server";
import { firmaValida, manejarMensaje, mensajesDelWebhook, verificarSuscripcion, type WebhookWA } from "@/lib/canales/whatsapp";

// Webhook de WhatsApp Cloud API. URL a configurar en Meta: https://<app>/api/webhooks/whatsapp
export const maxDuration = 60;

/** Verificación al registrar el webhook en Meta (hub.challenge). */
export async function GET(request: Request) {
  const challenge = verificarSuscripcion(new URL(request.url).searchParams);
  return challenge ? new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } })
    : new Response("No autorizado", { status: 403 });
}

/** Mensajes entrantes. Firma verificada sobre el cuerpo CRUDO; 200 enseguida y proceso con after(). */
export async function POST(request: Request) {
  const crudo = await request.text();
  if (!firmaValida(crudo, request.headers.get("x-hub-signature-256"))) return new Response("No autorizado", { status: 401 });

  let w: WebhookWA;
  try { w = JSON.parse(crudo) as WebhookWA; } catch { return new Response("ok"); }
  const mensajes = mensajesDelWebhook(w);
  if (mensajes.length) after(async () => { for (const m of mensajes) await manejarMensaje(m); });
  return new Response("ok"); // también para estados de entrega (sent/delivered/read), que se ignoran
}
