"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_SESION,
  ControlIntentos,
  autenticar,
  crearToken,
  nombreValido,
  opcionesCookie,
  rutaSiguiente,
  secretoSesion,
} from "@/lib/sesion";

export type EstadoIngreso = { error: string | null; usuario: string };

// Una instancia por servidor (Vercel reutiliza instancias). Ver lib/sesion.ts.
const intentos = new ControlIntentos();

const minutos = (ms: number) => Math.max(1, Math.ceil(ms / 60_000));

async function ipCliente(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Inicia sesión: usuario y contraseña (scrypt) → cookie firmada de 8 h. Bloqueo de 10 min tras 5 fallos. */
export async function ingresar(_previo: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const usuario = String(form.get("usuario") ?? "").trim().toLowerCase();
  const clave = String(form.get("clave") ?? "");
  const siguiente = rutaSiguiente(form.get("siguiente"));
  const secreto = secretoSesion();
  if (!secreto) {
    // Sin SESSION_SECRET el panel sigue con la ventana de usuario y clave del navegador (basic auth).
    redirect("/panel");
  }
  if (!nombreValido(usuario) || !clave) return { error: "Escribe tu usuario y tu contraseña.", usuario };

  const ip = await ipCliente();
  const espera = intentos.esperaRestante(usuario, ip);
  if (espera > 0) {
    return { error: `Demasiados intentos fallidos. Espera ${minutos(espera)} min y vuelve a intentar.`, usuario };
  }

  const ok = autenticar(usuario, clave);
  if (!ok) {
    const bloqueado = intentos.fallo(usuario, ip);
    return {
      error: bloqueado
        ? "Demasiados intentos fallidos. Espera 10 min y vuelve a intentar."
        : "Usuario o contraseña incorrectos.",
      usuario,
    };
  }

  intentos.exito(usuario, ip);
  const { token } = crearToken(ok, secreto);
  (await cookies()).set(COOKIE_SESION, token, opcionesCookie());
  redirect(siguiente);
}

/** Cierra la sesión (borra la cookie) y vuelve a /ingresar. */
export async function salir(): Promise<void> {
  (await cookies()).set(COOKIE_SESION, "", opcionesCookie(0));
  redirect("/ingresar?salio=1");
}
