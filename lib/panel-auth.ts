// Autenticación del panel (sesión con cookie firmada o basic auth) y del cron. La usa también proxy.ts (Node).
//   Con SESSION_SECRET: PANEL_USERS = "ana:tecnico:scrypt.<sal>.<hash>,…" (npm run panel:usuario), ver lib/sesion.ts.
//   Sin SESSION_SECRET (compatibilidad): PANEL_USERS = "patricia:clave1,marco:clave2" y basic auth.
//   El nombre se guarda en approved_by / updated_by / registered_by.
//   CRON_SECRET = secreto que Vercel Cron envía como "Authorization: Bearer <CRON_SECRET>"
import { COOKIE_SESION, leerToken, modoSesion, rolAlcanza, secretoSesion, type Rol } from "@/lib/sesion";

/** Comparación en tiempo constante (sin node:crypto, para que funcione en cualquier runtime). */
function iguales(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let dif = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) dif |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return dif === 0;
}

function usuariosPanel(env: Record<string, string | undefined> = process.env): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const par of (env.PANEL_USERS ?? "").split(",")) {
    const i = par.indexOf(":");
    if (i > 0 && i < par.length - 1) mapa.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
  }
  return mapa;
}

/** Nombre del usuario del panel si el header Authorization: Basic es válido; si no, null. */
export function usuarioPanel(autorizacion: string | null, env: Record<string, string | undefined> = process.env): string | null {
  if (!autorizacion?.startsWith("Basic ")) return null;
  let texto: string;
  try { texto = new TextDecoder().decode(Uint8Array.from(atob(autorizacion.slice(6)), (c) => c.charCodeAt(0))); }
  catch { return null; }
  const i = texto.indexOf(":");
  if (i <= 0) return null;
  const usuario = texto.slice(0, i), clave = texto.slice(i + 1);
  const esperada = usuariosPanel(env).get(usuario);
  return esperada !== undefined && iguales(clave, esperada) ? usuario : null;
}

/** true si el header es "Bearer <CRON_SECRET>" (Vercel Cron). Sin CRON_SECRET configurado, nunca. */
export function esCron(autorizacion: string | null, env: Record<string, string | undefined> = process.env): boolean {
  const secreto = env.CRON_SECRET;
  return !!secreto && !!autorizacion && iguales(autorizacion, `Bearer ${secreto}`);
}

export const noAutorizado = () =>
  new Response("Autenticación requerida", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="PACHA panel", charset="UTF-8"' } });

/* ---------------------------------------------------------------------------
 * v0.4 (dom 22/11): sesión con cookie firmada y roles (lib/sesion.ts).
 * Con SESSION_SECRET: vale la cookie de sesión. Sin él: basic auth de antes, con rol admin.
 * ------------------------------------------------------------------------- */

export type AccesoPanel = { usuario: string; rol: Rol };

/** Lee el valor de una cookie del header Cookie (sin depender de next/headers). */
export function leerCookie(header: string | null, nombre: string): string | null {
  for (const parte of (header ?? "").split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nombre) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}

/** Usuario y rol a partir de los headers de una petición (Cookie o Authorization), según el modo. */
export function accesoDeHeaders(
  h: { cookie: string | null; authorization: string | null },
  env: Record<string, string | undefined> = process.env,
): AccesoPanel | null {
  const secreto = secretoSesion(env);
  if (secreto) {
    const s = leerToken(leerCookie(h.cookie, COOKIE_SESION), secreto, { env });
    return s ? { usuario: s.usuario, rol: s.rol } : null;
  }
  const u = usuarioPanel(h.authorization, env);
  return u ? { usuario: u, rol: "admin" } : null; // compatibilidad: basic auth = admin, como antes
}

/**
 * Para las rutas /api del panel: devuelve el acceso o la respuesta de error (401 sin sesión, 403 sin rol).
 * Uso: `const a = exigirAccesoApi(request, "tecnico"); if (a instanceof Response) return a;`
 */
export function exigirAccesoApi(request: Request, rol: Rol): AccesoPanel | Response {
  const a = accesoDeHeaders({ cookie: request.headers.get("cookie"), authorization: request.headers.get("authorization") });
  if (!a) return modoSesion() ? new Response("Sesión requerida: entra por /ingresar", { status: 401 }) : noAutorizado();
  if (!rolAlcanza(a.rol, rol)) return new Response(`Esta acción es solo para el rol ${rol}`, { status: 403 });
  return a;
}
