// Seed de tarjetas: data/tarjetas/tarjetas.json -> tabla `lessons` (upsert por id).
//   npx tsx scripts/seed-lecciones.ts            (valida y carga)
//   npx tsx scripts/seed-lecciones.ts --validar  (solo valida, no toca la base)
// Todo o nada: si UNA tarjeta no valida, el script falla con el id y el motivo y no inserta ninguna.
// No toca las rutas de imágenes ni de audio (las rellenan subir-imagenes / exportar / subir-audios).
// Una tarjeta verificada/revisada debe traer verified_hash igual a la huella de su texto (ver verificar-tarjeta.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { Tarjeta } from "@/contratos/tipos";
import { problemasDeContenido, problemasDeVerificacion } from "@/lib/tarjeta-contenido";
import { RAIZ, clienteSupabase, falla } from "./_comun";

const ARCHIVO = path.join(RAIZ, "data", "tarjetas", "tarjetas.json");

/** Columnas de contenido que gestiona el seed (las de Storage quedan fuera para no borrarlas). */
const COLUMNAS_CONTENIDO = [
  "id", "hazard", "phase", "title", "steps", "step_sources", "factor_tags", "source_doc", "source_page",
  "source_url", "author", "verified_by", "reviewed_by", "status",
] as const;

function validarArchivo(crudo: unknown): Tarjeta[] {
  if (!Array.isArray(crudo)) falla(`${ARCHIVO} debe ser una lista de tarjetas`);
  const errores: string[] = [];
  const ids = new Set<string>();
  const tarjetas: Tarjeta[] = [];
  crudo.forEach((fila, i) => {
    const id = (fila as { id?: string })?.id ?? `(fila ${i + 1} sin id)`;
    const r = Tarjeta.safeParse(fila);
    if (!r.success) {
      errores.push(`${id}: ${r.error.issues.map((x) => `${x.path.join(".") || "tarjeta"} → ${x.message}`).join("; ")}`);
      return;
    }
    const contenido = [
      ...problemasDeContenido(r.data),
      // verified_hash vive solo en el JSON (no es columna): ata la verificación al texto verificado
      ...problemasDeVerificacion(r.data, (fila as { verified_hash?: unknown }).verified_hash),
    ];
    if (contenido.length) errores.push(`${id}: ${contenido.join("; ")}`);
    if (ids.has(id)) errores.push(`${id}: id repetido`);
    ids.add(id);
    tarjetas.push(r.data);
  });
  if (errores.length) falla(`No se cargó NINGUNA tarjeta. ${errores.length} con errores:\n  - ${errores.join("\n  - ")}`);
  return tarjetas;
}

async function main() {
  const tarjetas = validarArchivo(JSON.parse(readFileSync(ARCHIVO, "utf8")));
  console.log(`✔ ${tarjetas.length} tarjetas validan con el contrato Tarjeta:`);
  for (const t of tarjetas) console.log(`   ${t.id.padEnd(26)} ${t.status}`);
  if (process.argv.includes("--validar")) return;

  const filas = tarjetas.map((t) =>
    Object.fromEntries(COLUMNAS_CONTENIDO.map((c) => [c, (t as Record<string, unknown>)[c] ?? null])),
  );
  // Un solo upsert = una sola transacción en PostgREST: entra todo o nada.
  const { error } = await clienteSupabase().from("lessons").upsert(filas, { onConflict: "id" });
  if (error) falla(`Supabase rechazó el upsert (no se cargó nada): ${error.message}`);
  console.log(`✔ Upsert de ${filas.length} tarjetas en lessons.`);
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
