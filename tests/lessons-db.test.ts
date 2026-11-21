// Prueba contra la base real: los 6 ids del menú existen en `lessons`.
// Solo corre con `npm run test:db` (necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY y el seed aplicado).
// En CI, sin secretos, se omite.
import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { MENU } from "@/contratos/tipos";

const raiz = path.resolve(__dirname, "..");
// Activa con `npm run test:db` (npm define npm_lifecycle_event) o con PROBAR_SUPABASE=1.
const pedido = process.env.npm_lifecycle_event === "test:db" || process.env.PROBAR_SUPABASE === "1";
if (pedido) {
  for (const f of [".env.local", ".env"]) if (existsSync(path.join(raiz, f))) process.loadEnvFile(path.join(raiz, f));
}
const activo = pedido && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!activo)("lessons en Supabase", () => {
  it("los 6 ids del menú existen en lessons", async () => {
    const sb = createClient(new URL(process.env.SUPABASE_URL!).origin, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
    const ids = [...new Set(Object.values(MENU).flatMap((o) => [...o.antes, ...o.ahora]))];
    const { data, error } = await sb.from("lessons").select("id").in("id", ids);
    expect(error).toBeNull();
    expect((data ?? []).map((f) => f.id).sort()).toEqual(ids.sort());
  });
});
