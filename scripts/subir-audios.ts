// Sube los audios que haya en assets/audio/ y rellena audio_ogg_path / audio_mp3_path en `lessons`.
//   npx tsx scripts/subir-audios.ts
// Nombres esperados: <id>.ogg (Opus mono 32k) y <id>.mp3 (64k). Ver scripts/audio-comandos.md.
// Si una tarjeta no tiene audio, no pasa nada: el bot envía solo imagen y texto.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { BUCKET_AUDIOS } from "@/lib/tarjeta-publica";
import { RAIZ, clienteSupabase, falla, kb } from "./_comun";

const CARPETA = path.join(RAIZ, "assets", "audio");
const FORMATOS = { ogg: { mime: "audio/ogg", columna: "audio_ogg_path" }, mp3: { mime: "audio/mpeg", columna: "audio_mp3_path" } } as const;

async function main() {
  if (!existsSync(CARPETA)) falla(`No existe ${CARPETA}`);
  const sb = clienteSupabase();
  const { data, error } = await sb.from("lessons").select("id").order("id");
  if (error) falla(`No se pudo leer lessons: ${error.message}`);
  const ids = (data ?? []).map((f) => f.id as string);

  const archivos = readdirSync(CARPETA);
  const desconocidos = archivos.filter((f) => /\.(ogg|mp3)$/i.test(f) && !ids.includes(f.replace(/\.(ogg|mp3)$/i, "")));
  if (desconocidos.length) console.warn(`⚠ Ignorados (el nombre no es un id de lessons): ${desconocidos.join(", ")}`);

  for (const id of ids) {
    const cambios: Record<string, string> = {};
    for (const [ext, { mime, columna }] of Object.entries(FORMATOS)) {
      const local = path.join(CARPETA, `${id}.${ext}`);
      if (!existsSync(local)) continue;
      const remoto = `lessons/${id}.${ext}`;
      const bytes = readFileSync(local);
      const { error } = await sb.storage.from(BUCKET_AUDIOS).upload(remoto, bytes, { contentType: mime, upsert: true });
      if (error) {
        console.warn(`  ⚠ ${remoto}: ${error.message}`);
        continue;
      }
      cambios[columna] = remoto;
      console.log(`  ✔ ${remoto} (${kb(bytes.length)})`);
    }
    if (Object.keys(cambios).length === 0) {
      console.log(`  · ${id}: sin audio (el bot enviará imagen y texto)`);
      continue;
    }
    const { error } = await sb.from("lessons").update(cambios).eq("id", id);
    if (error) falla(`No se pudieron guardar las rutas de audio de ${id}: ${error.message}`);
  }
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
