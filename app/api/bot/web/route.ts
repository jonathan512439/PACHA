import { cookies } from "next/headers";
import { BotWebRequest, MENSAJES, type BotWebResponse } from "@/contratos/tipos";
import { procesarMensaje } from "@/lib/bot/procesar";

// Canal web del bot: lo usa /probar (B). El usuario se identifica con una cookie anónima, nunca por el body.
export const maxDuration = 60;

const COOKIE = "pacha_sid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(request: Request) {
  const parsed = BotWebRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

  const jar = await cookies();
  let sid = jar.get(COOKIE)?.value;
  if (!sid || !UUID.test(sid)) {
    sid = crypto.randomUUID();
    jar.set(COOKIE, sid, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
  }

  try {
    const respuestas = await procesarMensaje({ canal: "web", usuarioId: sid, mensajeId: crypto.randomUUID(), ...parsed.data });
    return Response.json({ respuestas } satisfies BotWebResponse);
  } catch (e) {
    console.error("bot/web", e);
    return Response.json({ respuestas: [{ tipo: "texto", texto: MENSAJES.error }] } satisfies BotWebResponse, { status: 500 });
  }
}
