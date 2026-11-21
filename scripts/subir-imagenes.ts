// Sube las ilustraciones ya optimizadas a Supabase Storage y guarda las rutas en `lessons`.
//   npx tsx scripts/subir-imagenes.ts             (valida y sube)
//   npx tsx scripts/subir-imagenes.ts --validar   (solo comprueba los archivos locales)
// Origen:  assets/lessons/<id>/header.jpg|webp  y  paso1.webp, paso2.webp, paso3.webp
// Destino: bucket 'tarjetas', lessons/<id>/header.<ext> y lessons/<id>/pasoN.webp
// Si falta o falla un paso, su posición queda en null y la tarjeta muestra el ícono de respaldo.
// Si falta un encabezado, la web usa el de helada-antes_animales-01 (y si tampoco está, una franja neutra).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { MENU } from "@/contratos/tipos";
import { BUCKET_IMAGENES } from "@/lib/tarjeta-publica";
import { RAIZ, clienteSupabase, falla, kb } from "./_comun";

const CARPETA = path.join(RAIZ, "assets", "lessons");
const MIME = { jpg: "image/jpeg", webp: "image/webp", png: "image/png" } as const;

/** Las 6 tarjetas del MVP = las del menú. */
const IDS = [...new Set(Object.values(MENU).flatMap((o) => [...o.antes, ...o.ahora]))].sort();

type Plan = { id: string; encabezado: { local: string; remoto: string; ext: keyof typeof MIME } | null; pasos: ({ local: string; remoto: string } | null)[] };

function planificar(): { planes: Plan[]; faltan: string[] } {
  const faltan: string[] = [];
  const planes = IDS.map((id): Plan => {
    const ext = (["jpg", "webp", "png"] as const).find((e) => existsSync(path.join(CARPETA, id, `header.${e}`)));
    if (!ext) faltan.push(`${id}/header.(jpg|webp)`);
    const pasos = [1, 2, 3].map((n) => {
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
  const { planes, faltan } = planificar();
  const encabezados = planes.filter((p) => p.encabezado).length;
  const pasos = planes.reduce((n, p) => n + p.pasos.filter(Boolean).length, 0);
  console.log(`Archivos locales: ${encabezados}/6 encabezados, ${pasos}/18 pasos.`);
  if (faltan.length) console.warn(`⚠ Faltan (usarán respaldo):\n  - ${faltan.join("\n  - ")}`);
  if (process.argv.includes("--validar")) process.exit(faltan.length ? 1 : 0);

  const sb = clienteSupabase();
  const { data: filas, error } = await sb.from("lessons").select("id").in("id", IDS);
  if (error) falla(`No se pudo leer lessons: ${error.message}`);
  const enBase = new Set((filas ?? []).map((f) => f.id as string));
  const sinFila = IDS.filter((id) => !enBase.has(id));
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

  let fallos = faltan.length;
  for (const p of planes) {
    console.log(p.id);
    const header = p.encabezado && (await subir(p.encabezado.local, p.encabezado.remoto, MIME[p.encabezado.ext])) ? p.encabezado.remoto : null;
    const rutasPasos: (string | null)[] = [];
    for (const paso of p.pasos) rutasPasos.push(paso && (await subir(paso.local, paso.remoto, MIME.webp)) ? paso.remoto : null);
    fallos += (p.encabezado && !header ? 1 : 0) + p.pasos.filter((x, i) => x && !rutasPasos[i]).length;

    const { error } = await sb.from("lessons").update({ header_image_path: header, step_image_paths: rutasPasos }).eq("id", p.id);
    if (error) falla(`No se pudieron guardar las rutas de ${p.id}: ${error.message}`);
  }
  console.log(fallos ? `\n⚠ Terminado con ${fallos} imagen(es) en respaldo.` : "\n✔ 6 encabezados y 18 pasos subidos y guardados en lessons.");
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
