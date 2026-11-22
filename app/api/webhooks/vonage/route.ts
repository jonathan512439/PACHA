import { after } from "next/server";
import { manejarWebhookVonage, webhookVonageValido, type EntranteVonage } from "@/lib/canales/vonage";

// Webhook de WhatsApp por el sandbox de Vonage (entrantes y estados de entrega).
// En dashboard.nexmo.com/messages/sandbox, Inbound y Status = https://<app>/api/webhooks/vonage?k=<VONAGE_WEBHOOK_SECRET>
export const maxDuration = 60;

export async function POST(request: Request) {
  const crudo = await request.text();
  if (!webhookVonageValido(new URL(request.url), request.headers.get("authorization"), crudo))
    return new Response("No autorizado", { status: 401 });
  let m: EntranteVonage;
  try { m = JSON.parse(crudo) as EntranteVonage; } catch { return new Response("ok"); }
  after(() => manejarWebhookVonage(m));
  return new Response("ok"); // 200 enseguida: Vonage reintenta ante cualquier otra respuesta
}
