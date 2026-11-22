import "server-only";
import { cookies, headers } from "next/headers";
import { accesoDeHeaders, type AccesoPanel } from "@/lib/panel-auth";
import { COOKIE_SESION, rolAlcanza, type Rol } from "@/lib/sesion";

/**
 * Acceso al panel desde Server Components y Server Actions (Data Access Layer del panel).
 * Con SESSION_SECRET lee la cookie firmada; sin él, el basic auth de antes (rol admin).
 * Se llama en CADA Server Action: no se confía solo en proxy.ts (guía de Next 16, authentication.md).
 */
export async function accesoActual(): Promise<AccesoPanel | null> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const valor = c.get(COOKIE_SESION)?.value ?? null;
  return accesoDeHeaders({
    cookie: valor ? `${COOKIE_SESION}=${encodeURIComponent(valor)}` : null,
    authorization: h.get("authorization"),
  });
}

export class ErrorAcceso extends Error {}

/** Exige sesión válida y el rol pedido. Lanza ErrorAcceso con un mensaje para mostrar. */
export async function exigirAcceso(rol: Rol): Promise<AccesoPanel> {
  const a = await accesoActual();
  if (!a) throw new ErrorAcceso("Tu sesión venció o no es válida. Vuelve a entrar en /ingresar.");
  if (!rolAlcanza(a.rol, rol)) throw new ErrorAcceso(`Esta acción es solo para el rol ${rol}. Tu rol es ${a.rol}.`);
  return a;
}
