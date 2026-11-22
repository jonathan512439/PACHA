import { ErrorAlerta, descartarAlerta } from "@/lib/alertas";
import { exigirAccesoApi } from "@/lib/panel-auth";

// POST /api/alertas/[id]/descartar — solo panel (sesión o basic auth, rol tecnico).
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/alertas/[id]/descartar">) {
  const acceso = exigirAccesoApi(request, "tecnico");
  if (acceso instanceof Response) return acceso;
  const { id } = await ctx.params;
  try {
    return Response.json(await descartarAlerta(id));
  } catch (e) {
    if (e instanceof ErrorAlerta) return Response.json({ error: e.message }, { status: e.status });
    console.error("alertas/descartar", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
