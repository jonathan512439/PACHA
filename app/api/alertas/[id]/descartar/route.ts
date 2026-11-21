import { ErrorAlerta, descartarAlerta } from "@/lib/alertas";
import { noAutorizado, usuarioPanel } from "@/lib/panel-auth";

// POST /api/alertas/[id]/descartar — solo panel (basic auth, PANEL_USERS).
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/alertas/[id]/descartar">) {
  const usuario = usuarioPanel(request.headers.get("authorization"));
  if (!usuario) return noAutorizado();
  const { id } = await ctx.params;
  try {
    return Response.json(await descartarAlerta(id));
  } catch (e) {
    if (e instanceof ErrorAlerta) return Response.json({ error: e.message }, { status: e.status });
    console.error("alertas/descartar", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
