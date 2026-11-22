// Sube las ilustraciones ya optimizadas a Supabase Storage y guarda las rutas en `lessons`.
//   npx tsx scripts/subir-imagenes.ts                  (todas las tarjetas de data/tarjetas/tarjetas.json)
//   npx tsx scripts/subir-imagenes.ts --ids id1,id2    (solo esas; también tarjetas creadas en el panel, que no están en el JSON)
//   npx tsx scripts/subir-imagenes.ts --validar        (solo comprueba los archivos locales)
// Origen:  assets/lessons/<id>/header.jpg|webp|png  y  paso1.webp … pasoN.webp (N = pasos de la tarjeta, 3 a 5)
// Destino: bucket 'tarjetas', lessons/<id>/header.<ext> y lessons/<id>/pasoN.webp
// Si falta o falla un paso, su posición queda en null y la tarjeta muestra el ícono de respaldo.
// Si falta un encabezado, la web usa el de helada-antes_animales-01 (y si tampoco está, una franja neutra).
// OJO: escribe directo en `lessons` (sin pasar por la verificación). Para tarjetas ya publicadas, lo normal es
// subir las imágenes desde el editor del panel (Tarjetas › Editar), que las publica al verificar la versión.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { BUCKET_IMAGENES } from "@/lib/tarjeta-publica";
import { RAIZ, clienteSupabase, falla, kb } from "./_comun";

const CARPETA = path.join(RAIZ, "assets", "lessons");
const MIME = { jpg: "image/jpeg", webp: "image/webp", png: "image/png" } as const;

const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** Tarjetas del paquete y cuántos pasos tiene cada una (v0.4: de 3 a 5). */
const PAQUETE = (JSON.parse(readFileSync(path.join(RAIZ, "data", "tarjetas", "tarjetas.json"), "utf8")) as { id: string; steps: string[] }[])
  .map((t) => ({ id: t.id, pasos: t.steps.length }));
const PEDIDAS = arg("--ids")?.split(",").map((s) => s.trim()).filter(Boolean);
let TARJETAS = PAQUETE.filter((t) => !PEDIDAS || PEDIDAS.includes(t.id));

/** Las pedidas que no están en el JSON (creadas en el panel) se buscan en `lessons` para saber cuántos pasos tienen. */
async function agregarTarjetasDelPanel() {
  const fuera = (PEDIDAS ?? []).filter((id) => !PAQUETE.some((t) => t.id === id));
  if (fuera.length) {
    const { data, error } = await clienteSupabase().from("lessons").select("id, steps").in("id", fuera);
    if (error) falla(`No se pudo leer lessons: ${error.message}`);
    const halladas = (data ?? []).map((f) => ({ id: f.id as string, pasos: (f.steps as string[]).length }));
    const desconocidas = fuera.filter((id) => !halladas.some((t) => t.id === id));
    if (desconocidas.length) falla(`No existen (ni en tarjetas.json ni en lessons): ${desconocidas.join(", ")}`);
    TARJETAS = [...TARJETAS, ...halladas];
  }
  TARJETAS.sort((a, b) => a.id.localeCompare(b.id));
}

type Plan = { id: string; encabezado: { local: string; remoto: string; ext: keyof typeof MIME } | null; pasos: ({ local: string; remoto: string } | null)[] };

function planificar(): { planes: Plan[]; faltan: string[] } {
  const faltan: string[] = [];
  const planes = TARJETAS.map(({ id, pasos: cantidad }): Plan => {
    const ext = (["jpg", "webp", "png"] as const).find((e) => existsSync(path.join(CARPETA, id, `header.${e}`)));
    if (!ext) faltan.push(`${id}/header.(jpg|webp)`);
    const pasos = Array.from({ length: cantidad }, (_, i) => i + 1).map((n) => {
      const local = path.join(CARPETA, id, `paso${n}.webp`);
      if (!existsSync(local)) {
        faltan.push(`${id}/paso${n}.webp`);
        return null;
      }
      return { local, remoto: `lessons/${id}/paso${n}.webp` };
    });
    return {
      id,
      encabezado: ext ? { local: path.join(CARPETA, id, `header.${ext}`), remoto: `lessons/${id}/header.${ext}`, ext } : null,
      pasos,
    };
  });
  return { planes, faltan };
}

async function main() {
  await agregarTarjetasDelPanel();
  const { planes, faltan } = planificar();
  const encabezados = planes.filter((p) => p.encabezado).length;
  const pasos = planes.reduce((n, p) => n + p.pasos.filter(Boolean).length, 0);
  const totalPasos = planes.reduce((n, p) => n + p.pasos.length, 0);
  console.log(`Archivos locales: ${encabezados}/${planes.length} encabezados, ${pasos}/${totalPasos} pasos.`);
  if (faltan.length) console.warn(`⚠ Faltan (usarán respaldo):\n  - ${faltan.join("\n  - ")}`);
  if (process.argv.includes("--validar")) process.exit(faltan.length ? 1 : 0);

  const sb = clienteSupabase();
  const ids = planes.map((p) => p.id);
  const { data: filas, error } = await sb.from("lessons").select("id").in("id", ids);
  if (error) falla(`No se pudo leer lessons: ${error.message}`);
  const enBase = new Set((filas ?? []).map((f) => f.id as string));
  const sinFila = ids.filter((id) => !enBase.has(id));
  if (sinFila.length) falla(`Estas tarjetas no están en lessons (corre antes el seed): ${sinFila.join(", ")}`);

  const subir = async (local: string, remoto: string, mime: string) => {
    const bytes = readFileSync(local);
    const { error } = await sb.storage.from(BUCKET_IMAGENES).upload(remoto, bytes, { contentType: mime, upsert: true, cacheControl: "3600" });
    if (error) {
      console.warn(`  ⚠ ${remoto}: ${error.message} (usará respaldo)`);
      return false;
    }
    console.log(`  ✔ ${remoto} (${kb(bytes.length)})`);
    return true;
  };

  let fallos = 0;
  for (const p of planes) {
    console.log(p.id);
    const header = p.encabezado && (await subir(p.encabezado.local, p.encabezado.remoto, MIME[p.encabezado.ext])) ? p.encabezado.remoto : null;
    const rutasPasos: (string | null)[] = [];
    for (const paso of p.pasos) rutasPasos.push(paso && (await subir(paso.local, paso.remoto, MIME.webp)) ? paso.remoto : null);
    fallos += (p.encabezado && !header ? 1 : 0) + p.pasos.filter((x, i) => x && !rutasPasos[i]).length;

    const { error } = await sb.from("lessons").update({ header_image_path: header, step_image_paths: rutasPasos }).eq("id", p.id);
    if (error) falla(`No se pudieron guardar las rutas de ${p.id}: ${error.message}`);
  }
  console.log(`\n${fallos ? `⚠ ${fallos} subida(s) fallaron.` : "✔ Subidas sin errores."} ${faltan.length ? `${faltan.length} archivo(s) faltantes usan respaldo.` : ""}`);
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
