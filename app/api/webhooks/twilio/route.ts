import { after } from "next/server";
import { firmaTwilioValida, manejarMensajeTwilio } from "@/lib/canales/twilio";

// Webhook de WhatsApp por Twilio. En Twilio: Messaging › Try it out › WhatsApp sandbox settings ›
// "When a message comes in" = https://<app>/api/webhooks/twilio (método POST).
export const maxDuration = 60;

const VACIO = () => new Response("<Response></Response>", { status: 200, headers: { "content-type": "text/xml" } });

/** Mensajes entrantes. Firma verificada; responde enseguida y procesa con after() (el bot contesta por la API). */
export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text());
  const firma = request.headers.get("x-twilio-signature");
  // Twilio firma con la URL exacta configurada: se acepta la fijada en TWILIO_WEBHOOK_URL o la que vio el servidor (https).
  const u = new URL(request.url);
  const candidatas = [process.env.TWILIO_WEBHOOK_URL?.trim(), request.url, `https://${u.host}${u.pathname}${u.search}`].filter(Boolean) as string[];
  if (!candidatas.some((url) => firmaTwilioValida(url, params, firma))) return new Response("No autorizado", { status: 403 });
  after(() => manejarMensajeTwilio(params));
  return VACIO();
}
