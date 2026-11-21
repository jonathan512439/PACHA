import { extraerAviso, interpretarMensaje, GeminiNoDisponible } from "@/lib/gemini";
import { tarjetasEnviables, type TarjetaResumen } from "@/lib/tarjetas";
import { decidirAlerta } from "@/contratos/tipos";

// Ruta SOLO de desarrollo para probar la integración con Gemini dentro de Next.
// En producción (Vercel, también en preview) responde 404.
// POST { "texto": "..." }                          -> interpretarMensaje
// POST { "audio": { "base64": "...", "mime": "audio/ogg" } } -> interpretarMensaje
// POST { "boletinUrl": "https://senamhi.gob.bo/....pdf" }    -> extraerAviso + decidirAlerta
// "tarjetas" (opcional) reemplaza la lista de tarjetas enviables para probar la elección de ids.
export const maxDuration = 60;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    texto?: string;
    audio?: { base64: string; mime: string };
    boletinUrl?: string;
    tarjetas?: TarjetaResumen[];
  } | null;
  if (!body) return Response.json({ error: "JSON inválido" }, { status: 400 });

  try {
    if (body.boletinUrl) {
      const url = new URL(body.boletinUrl);
      if (url.hostname !== "senamhi.gob.bo") return Response.json({ error: "Solo PDFs de senamhi.gob.bo" }, { status: 400 });
      const r = await fetch(url);
      if (!r.ok) return Response.json({ error: `Descarga falló: HTTP ${r.status}` }, { status: 502 });
      const pdf = new Uint8Array(await r.arrayBuffer());
      const res = await extraerAviso(pdf);
      return Response.json({ ...res, decision: decidirAlerta(res.datos) });
    }
    const tarjetas = body.tarjetas ?? (await tarjetasEnviables());
    const res = await interpretarMensaje({ texto: body.texto, audio: body.audio }, tarjetas);
    return Response.json({ ...res, tarjetasOfrecidas: tarjetas.length });
  } catch (e) {
    const status = e instanceof GeminiNoDisponible ? 503 : 500;
    return Response.json({ error: String(e) }, { status });
  }
}
