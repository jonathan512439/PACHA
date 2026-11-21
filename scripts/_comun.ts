// Utilidades de los scripts locales (se corren con `npx tsx`, NUNCA en Vercel).
// No importa lib/supabase.ts porque ese módulo es "server-only" (solo dentro de Next).
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const RAIZ = path.resolve(import.meta.dirname, "..");

/** Carga .env.local y .env (sin pisar variables ya definidas). */
export function cargarEntorno() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(RAIZ, f);
    if (existsSync(p)) process.loadEnvFile(p);
  }
}

export function clienteSupabase(): SupabaseClient {
  cargarEntorno();
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) falla("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (en .env.local o .env)");
  // Acepta la URL con o sin sufijo /rest/v1/
  return createClient(new URL(url).origin, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function falla(mensaje: string): never {
  console.error(`\n✖ ${mensaje}\n`);
  process.exit(1);
}

export const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
