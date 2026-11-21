// Exporta cada tarjeta a PNG 1080×1350 desde /tarjetas/[id]/imagen (SOLO en el portátil, no en Vercel).
//   1) en otra terminal: npm run dev            (con DEMO_PERMITIR_BORRADOR=1 si las tarjetas siguen en borrador)
//   2) npx playwright install chromium          (una sola vez)
//   3) npx tsx scripts/exportar-tarjetas.ts [--base http://localhost:3000] [--solo id1,id2] [--sin-subir]
// Guarda una copia en exports/tarjetas/<id>.png (ignorado por git), la sube al bucket 'tarjetas'
// en lessons/<id>/tarjeta-<estado>-<huella>.png y rellena card_image_path.
// La huella cambia si cambia el texto o el estado: el bot nunca adjunta un PNG desactualizado.
// Cada PNG debe pesar < 400 KB; si no, se recomprime (paleta de colores con sharp).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { Tarjeta } from "@/contratos/tipos";
import { BUCKET_IMAGENES, rutaPngTarjeta } from "@/lib/tarjeta-publica";
import { RAIZ, clienteSupabase, falla, kb } from "./_comun";

const LIMITE = 400 * 1024;
const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const BASE = (arg("--base") ?? "http://localhost:3000").replace(/\/$/, "");
const SOLO = arg("--solo")?.split(",").map((s) => s.trim());
const SUBIR = !process.argv.includes("--sin-subir");
const SALIDA = path.join(RAIZ, "exports", "tarjetas");

/** Recomprime un PNG a paleta (cada vez con menos colores) hasta bajar del límite. */
async function recomprimir(png: Buffer): Promise<Buffer> {
  let sharp: typeof import("sharp").default;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    throw new Error("PNG > 400 KB y no está disponible 'sharp' para recomprimir (npm i -D sharp)");
  }
  for (const colores of [256, 192, 128, 96, 64]) {
    const salida = await sharp(png).png({ palette: true, colors: colores, effort: 10, compressionLevel: 9, dither: 1 }).toBuffer();
    console.log(`    recomprimido a ${colores} colores: ${kb(salida.length)}`);
    if (salida.length < LIMITE) return salida;
  }
  throw new Error("No se consiguió bajar de 400 KB ni con 64 colores");
}

async function main() {
  const sb = clienteSupabase();
  const { data, error } = await sb.from("lessons").select("*").order("id");
  if (error) falla(`No se pudo leer lessons: ${error.message}`);
  const tarjetas = (data ?? [])
    .map((f) => Tarjeta.parse({ ...f, source_url: f.source_url ?? undefined }))
    .filter((t) => !SOLO || SOLO.includes(t.id));
  if (tarjetas.length === 0) falla("No hay tarjetas que exportar (¿corriste el seed?)");

  try {
    await fetch(BASE);
  } catch {
    falla(`No responde ${BASE}. Arranca antes "npm run dev" (o pasa --base).`);
  }

  mkdirSync(SALIDA, { recursive: true });
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const resumen: string[] = [];

  try {
    for (const t of tarjetas) {
      const url = `${BASE}/tarjetas/${t.id}/imagen`;
      console.log(`${t.id} (${t.status})`);
      const r = await pagina.goto(url, { waitUntil: "networkidle" });
      if (!r || !r.ok()) {
        resumen.push(`✖ ${t.id}: HTTP ${r?.status()}`);
        continue;
      }
      if (await pagina.locator("[data-en-verificacion]").count()) {
        resumen.push(`· ${t.id}: en borrador y el servidor no tiene DEMO_PERMITIR_BORRADOR=1 → no se exporta`);
        continue;
      }
      const tarjeta = pagina.locator("#tarjeta-exportable");
      await tarjeta.waitFor();
      // Espera a que todas las imágenes terminen (cargadas o reemplazadas por su respaldo).
      await pagina.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15_000 });
      await pagina.waitForTimeout(300);
      if (t.status === "borrador" && !(await pagina.locator("[data-etiqueta-borrador]").count())) {
        throw new Error(`${t.id} está en borrador y la imagen no muestra la etiqueta: no se exporta`);
      }

      let png = await tarjeta.screenshot({ type: "png" });
      console.log(`    captura: ${kb(png.length)}`);
      if (png.length >= LIMITE) png = await recomprimir(png);

      writeFileSync(path.join(SALIDA, `${t.id}.png`), png);
      if (SUBIR) {
        const remoto = rutaPngTarjeta(t);
        const { error: e1 } = await sb.storage.from(BUCKET_IMAGENES).upload(remoto, png, { contentType: "image/png", upsert: true });
        if (e1) throw new Error(`${t.id}: subida falló: ${e1.message}`);
        const { error: e2 } = await sb.from("lessons").update({ card_image_path: remoto }).eq("id", t.id);
        if (e2) throw new Error(`${t.id}: no se guardó card_image_path: ${e2.message}`);
        resumen.push(`✔ ${t.id}: ${kb(png.length)} → ${remoto}`);
      } else {
        resumen.push(`✔ ${t.id}: ${kb(png.length)} (solo local)`);
      }
    }
  } finally {
    await navegador.close();
  }
  console.log(`\n${resumen.join("\n")}\nCopias locales en ${path.relative(RAIZ, SALIDA)}/`);
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
