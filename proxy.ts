import { NextResponse, type NextRequest } from "next/server";
import { noAutorizado, usuarioPanel } from "@/lib/panel-auth";

// Protege el panel de la técnica con basic auth (PANEL_USERS). Las páginas públicas y el bot no pasan por aquí.
// Las Server Actions del panel se publican en la misma URL /panel/..., así que también quedan protegidas,
// y además cada acción vuelve a validar el usuario (app/panel/acciones.ts).
export function proxy(request: NextRequest) {
  if (!usuarioPanel(request.headers.get("authorization"))) return noAutorizado();
  return NextResponse.next();
}

export const config = { matcher: ["/panel", "/panel/:path*"] };
