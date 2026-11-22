import { buscarYProcesar } from "@/lib/boletin";
import { esCron, exigirAccesoApi } from "@/lib/panel-auth";

// Busca el boletín ALTIPLANO más reciente del Senamhi y, si es nuevo, prepara la alerta en BORRADOR.
//   GET  -> Vercel Cron (Authorization: Bearer <CRON_SECRET>), ver vercel.json
//   POST -> botón "Buscar boletín ahora" del panel (sesión o basic auth, rol admin)
export const maxDuration = 60;

async function ejecutar() {
  try {
    const r = await buscarYProcesar();
    return Response.json(r, { status: r.estado === "error" ? 502 : 200 });
  } catch (e) {
    console.error("boletin/buscar", e);
    return Response.json({ estado: "error", error: String(e) }, { status: 502 });
  }
}

export async function GET(request: Request) {
  if (!esCron(request.headers.get("authorization"))) return new Response("No autorizado", { status: 401 });
  return ejecutar();
}

export async function POST(request: Request) {
  const acceso = exigirAccesoApi(request, "admin");
  if (acceso instanceof Response) return acceso;
  return ejecutar();
}
