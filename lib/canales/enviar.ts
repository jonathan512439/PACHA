import "server-only";
import type { Canal, SalidaBot } from "@/contratos/tipos";
import { enviarSalidasTelegram } from "@/lib/canales/telegram";
import { enviarSalidasWhatsApp } from "@/lib/canales/whatsapp";
import { enviarSalidasTwilio, twilioActivo } from "@/lib/canales/twilio";

export class CanalSinEnvio extends Error {}

/**
 * Envía mensajes por iniciativa del sistema al canal de la persona.
 * El canal web (/probar) no tiene forma de recibir mensajes sin que la persona escriba: lanza CanalSinEnvio.
 */
export async function enviarPorCanal(canal: Canal, usuarioId: string, salidas: SalidaBot[]): Promise<void> {
  if (canal === "telegram") return enviarSalidasTelegram(usuarioId, salidas);
  // Con credenciales de Twilio, WhatsApp sale por Twilio (sandbox de la demo); si no, por la Cloud API de Meta.
  if (canal === "whatsapp") return twilioActivo() ? enviarSalidasTwilio(usuarioId, salidas) : enviarSalidasWhatsApp(usuarioId, salidas);
  throw new CanalSinEnvio("El canal web no recibe mensajes iniciados por el sistema");
}

/** TECNICA_CONTACTO = "telegram:<chat_id>" o "whatsapp:<número>". Devuelve null si no está configurado. */
export function contactoTecnica(): { canal: Canal; id: string } | null {
  const v = process.env.TECNICA_CONTACTO?.trim();
  const m = v?.match(/^(telegram|whatsapp):(.+)$/);
  return m ? { canal: m[1] as Canal, id: m[2].trim() } : null;
}
