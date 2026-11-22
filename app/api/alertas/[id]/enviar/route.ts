import { ErrorAlerta, enviarAlerta } from "@/lib/alertas";
import { exigirAccesoApi } from "@/lib/panel-auth";

// POST /api/alertas/[id]/enviar — solo panel (sesión o basic auth, rol tecnico).
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/alertas/[id]/enviar">) {
  const acceso = exigirAccesoApi(request, "tecnico");
  if (acceso instanceof Response) return acceso;
  const { id } = await ctx.params;
  try {
    return Response.json(await enviarAlerta(id));
  } catch (e) {
    if (e instanceof ErrorAlerta) return Response.json({ error: e.message }, { status: e.status });
    console.error("alertas/enviar", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
