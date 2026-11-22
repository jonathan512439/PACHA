// Carga data/tarjetas/versiones-propuestas.json como versiones EN BORRADOR del editor del panel (lesson_versions).
//   npm run proponer:versiones
// No publica nada: cada versión la verifica y publica otra persona en /panel/tarjetas › Por verificar.
// No repite una versión idéntica (mismo id y misma huella) que ya esté esperando verificación.
// Requiere la migración contratos/migraciones/2026-11-22_editor_tarjetas.sql.
import { readFileSync } from "node:fs";
import path from "node:path";
import { huellaDeContenido, validarContenido, type ContenidoTarjeta } from "@/lib/editor-tarjetas-contenido";
import { FUENTES } from "@/lib/fuentes";
import { RAIZ, clienteSupabase, falla } from "./_comun";

type Archivo = { redacto: string; versiones: { motivo: string; contenido: ContenidoTarjeta }[] };

async function main() {
  const a = JSON.parse(readFileSync(path.join(RAIZ, "data", "tarjetas", "versiones-propuestas.json"), "utf8")) as Archivo;
  const errores = a.versiones.flatMap((v) => validarContenido(v.contenido, FUENTES).map((p) => `${v.contenido.id}: ${p}`));
  if (errores.length) falla(`No se cargó nada:\n  - ${errores.join("\n  - ")}`);

  const sb = clienteSupabase();
  const prueba = await sb.from("lesson_versions").select("id").limit(1);
  if (prueba.error) falla(`Falta la migración 2026-11-22_editor_tarjetas.sql (${prueba.error.message})`);

  for (const v of a.versiones) {
    const huella = huellaDeContenido(v.contenido);
    const { data: ya } = await sb.from("lesson_versions").select("id").eq("lesson_id", v.contenido.id).eq("huella", huella).eq("estado", "borrador").limit(1);
    if (ya?.length) {
      console.log(`· ${v.contenido.id}: ya está esperando verificación (${ya[0].id})`);
      continue;
    }
    const { data, error } = await sb.from("lesson_versions").insert({
      lesson_id: v.contenido.id, contenido: v.contenido, estado: "borrador", motivo: v.motivo, huella, created_by: a.redacto,
    }).select("id").single();
    if (error) falla(`${v.contenido.id}: ${error.message}`);
    console.log(`✔ ${v.contenido.id}: versión en borrador ${data.id} → /panel/tarjetas/version/${data.id}`);
  }
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
