import { ErrorAlerta, aprobarAlerta } from "@/lib/alertas";
import { noAutorizado, usuarioPanel } from "@/lib/panel-auth";

// POST /api/alertas/[id]/aprobar — solo panel (basic auth, PANEL_USERS).
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/alertas/[id]/aprobar">) {
  const usuario = usuarioPanel(request.headers.get("authorization"));
  if (!usuario) return noAutorizado();
  const { id } = await ctx.params;
  try {
    return Response.json(await aprobarAlerta(id, usuario));
  } catch (e) {
    if (e instanceof ErrorAlerta) return Response.json({ error: e.message }, { status: e.status });
    console.error("alertas/aprobar", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
