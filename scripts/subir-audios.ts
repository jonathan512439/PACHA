// Sube los audios que haya en assets/audio/ y rellena audio_ogg_path / audio_mp3_path en `lessons`.
//   npx tsx scripts/subir-audios.ts            sube los audios vigentes
//   npx tsx scripts/subir-audios.ts --nombres  muestra el nombre que debe tener cada archivo (para audios hechos a mano)
// Nombres: <id>-<huella>.ogg (Opus mono 32k) y .mp3 (64k). La huella es la del texto ACTUAL de la tarjeta
// (huellaContenido): un audio grabado con un texto anterior NO se sube y el bot tampoco lo adjuntaría.
// Alerta: alertas/<clave>.ogg|mp3. Se generan con scripts/generar-audios.ts (o a mano: scripts/audio-comandos.md).
// Si una tarjeta no tiene audio, no pasa nada: el bot envía solo imagen y texto.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Tarjeta } from "@/contratos/tipos";
import { BUCKET_AUDIOS, huellaContenido, rutaAudioTarjeta } from "@/lib/tarjeta-publica";
import { RAIZ, clienteSupabase, falla, kb } from "./_comun";

const CARPETA = path.join(RAIZ, "assets", "audio");
const FORMATOS = { ogg: { mime: "audio/ogg", columna: "audio_ogg_path" }, mp3: { mime: "audio/mpeg", columna: "audio_mp3_path" } } as const;

async function main() {
  if (!existsSync(CARPETA)) falla(`No existe ${CARPETA}`);
  const sb = clienteSupabase();
  const { data, error } = await sb.from("lessons").select("*").order("id");
  if (error) falla(`No se pudo leer lessons: ${error.message}`);
  const tarjetas = (data ?? []).map((f) => Tarjeta.parse({ ...f, source_url: f.source_url ?? undefined }));

  if (process.argv.includes("--nombres")) {
    for (const t of tarjetas) console.log(`${t.id.padEnd(26)} ${t.id}-${huellaContenido(t)}.ogg  y  .mp3`);
    return;
  }

  const archivos = readdirSync(CARPETA).filter((f) => /\.(ogg|mp3)$/i.test(f));
  const usados = new Set<string>();

  for (const t of tarjetas) {
    const nombreVigente = `${t.id}-${huellaContenido(t)}`;
    const cambios: Record<string, string> = {};
    for (const [ext, { mime, columna }] of Object.entries(FORMATOS) as [keyof typeof FORMATOS, (typeof FORMATOS)[keyof typeof FORMATOS]][]) {
      const archivo = `${nombreVigente}.${ext}`;
      if (!existsSync(path.join(CARPETA, archivo))) continue;
      usados.add(archivo);
      const remoto = rutaAudioTarjeta(t, ext);
      const bytes = readFileSync(path.join(CARPETA, archivo));
      const { error } = await sb.storage.from(BUCKET_AUDIOS).upload(remoto, bytes, { contentType: mime, upsert: true });
      if (error) {
        console.warn(`  ⚠ ${remoto}: ${error.message}`);
        continue;
      }
      cambios[columna] = remoto;
      console.log(`  ✔ ${remoto} (${kb(bytes.length)})`);
    }
    if (Object.keys(cambios).length === 0) {
      console.log(`  · ${t.id}: sin audio vigente (el bot enviará imagen y texto)`);
      continue;
    }
    const { error } = await sb.from("lessons").update(cambios).eq("id", t.id);
    if (error) falla(`No se pudieron guardar las rutas de audio de ${t.id}: ${error.message}`);
  }

  // Archivos que no se subieron: de un texto anterior, sin huella (hechos a mano) o de ids desconocidos.
  for (const f of archivos.filter((x) => !usados.has(x))) {
    const t = tarjetas.find((x) => f.startsWith(`${x.id}-`) || f.replace(/\.(ogg|mp3)$/i, "") === x.id);
    if (!t) console.warn(`⚠ ${f}: no corresponde a ninguna tarjeta; ignorado`);
    else if (/^.+-[0-9a-f]{8}\.(ogg|mp3)$/i.test(f)) console.warn(`⚠ ${f}: grabado con un texto ANTERIOR de ${t.id}; no se sube (vuelve a generarlo)`);
    else console.warn(`⚠ ${f}: sin huella. Si dice el texto actual, renómbralo a ${t.id}-${huellaContenido(t)}${path.extname(f)}`);
  }

  // Audios de alertas: assets/audio/alertas/<clave>.ogg|mp3 -> bucket 'audios', alertas/<clave>.ogg|mp3.
  // lib/boletin.ts los adjunta a la alerta solo si existen con ese nombre exacto (p. ej. altiplano-2026-11-2).
  const carpetaAlertas = path.join(CARPETA, "alertas");
  if (existsSync(carpetaAlertas)) {
    for (const f of readdirSync(carpetaAlertas).filter((x) => /\.(ogg|mp3)$/i.test(x) && !x.includes(".tts."))) {
      const ext = f.split(".").pop()!.toLowerCase() as keyof typeof FORMATOS;
      const bytes = readFileSync(path.join(carpetaAlertas, f));
      const { error } = await sb.storage.from(BUCKET_AUDIOS).upload(`alertas/${f}`, bytes, { contentType: FORMATOS[ext].mime, upsert: true });
      if (error) console.warn(`  ⚠ alertas/${f}: ${error.message}`);
      else console.log(`  ✔ alertas/${f} (${kb(bytes.length)})`);
    }
  }
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
