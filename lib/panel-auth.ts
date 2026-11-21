// Autenticación del panel (basic auth) y del cron. Sin dependencias de Node: sirve también en proxy.ts (B).
//   PANEL_USERS = "patricia:clave1,marco:clave2"   (el nombre se guarda en approved_by / updated_by / registered_by)
//   CRON_SECRET = secreto que Vercel Cron envía como "Authorization: Bearer <CRON_SECRET>"

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
