import { NextResponse, type NextRequest } from "next/server";
import { accesoDeHeaders, noAutorizado } from "@/lib/panel-auth";
import { modoSesion } from "@/lib/sesion";

// Protege el panel. Las páginas públicas y el bot no pasan por aquí.
// - Con SESSION_SECRET: sin cookie de sesión válida → /ingresar?siguiente=<ruta>.
// - Sin SESSION_SECRET (compatibilidad): basic auth con PANEL_USERS, como antes.
// No es la única barrera: cada Server Action (app/panel/acciones.ts) y cada ruta /api del panel
// vuelve a validar la sesión y el rol.
export function proxy(request: NextRequest) {
  const acceso = accesoDeHeaders({
    cookie: request.headers.get("cookie"),
    authorization: request.headers.get("authorization"),
  });
  if (acceso) return NextResponse.next();
  if (!modoSesion()) return noAutorizado();
  const destino = new URL("/ingresar", request.url);
  destino.searchParams.set("siguiente", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(destino);
}

export const config = { matcher: ["/panel", "/panel/:path*"] };
