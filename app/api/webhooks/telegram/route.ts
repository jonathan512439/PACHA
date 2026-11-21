import { after } from "next/server";
import { manejarUpdate, secretoValido, type Update } from "@/lib/canales/telegram";

// Webhook de Telegram. Se registra con setWebhook (ver scratch/telegram-webhook.mjs) usando secret_token.
// Responde 200 enseguida (Telegram reintenta si tardamos) y procesa el mensaje después con after().
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!secretoValido(request.headers.get("x-telegram-bot-api-secret-token")))
    return new Response("No autorizado", { status: 401 });

  const update = (await request.json().catch(() => null)) as Update | null;
  if (update && typeof update.update_id === "number") after(() => manejarUpdate(update));
  return new Response("ok");
}
