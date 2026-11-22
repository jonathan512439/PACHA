import { ErrorAlerta, aprobarAlerta } from "@/lib/alertas";
import { exigirAccesoApi } from "@/lib/panel-auth";

// POST /api/alertas/[id]/aprobar — solo panel (sesión o basic auth, rol tecnico).
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/alertas/[id]/aprobar">) {
  const acceso = exigirAccesoApi(request, "tecnico");
  if (acceso instanceof Response) return acceso;
  const { usuario } = acceso;
  const { id } = await ctx.params;
  try {
    return Response.json(await aprobarAlerta(id, usuario));
  } catch (e) {
    if (e instanceof ErrorAlerta) return Response.json({ error: e.message }, { status: e.status });
    console.error("alertas/aprobar", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
