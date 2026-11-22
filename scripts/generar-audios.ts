// Genera los audios de las tarjetas (y el de la alerta del demo) con Gemini TTS + ffmpeg, SOLO en el portátil.
//   npx tsx scripts/generar-audios.ts                     tarjetas verificada/revisada que aún no tienen audio local
//   npx tsx scripts/generar-audios.ts --ids id1,id2       solo esas (deben estar verificadas)
//   npx tsx scripts/generar-audios.ts --alerta            audio de la alerta del demo (boletín 14–23 nov 2026)
//   opciones: --rehacer (pisa los archivos existentes) · --incluir-borrador (SOLO para pruebas; no subir)
// Salida: assets/audio/<id>-<huella>.mp3 (64k) y .ogg (Opus mono 32k). La huella es la del texto de la tarjeta:
// si el texto cambia, el audio viejo deja de servir (el bot no lo adjunta). Alerta: assets/audio/alertas/<clave>.mp3|.ogg
// Después: ESCUCHARLOS completos y subir con `npm run subir:audios`.
// Datos de la API (probados por A, ver decisiones.md): modelo de voz solo en v1beta, API `interactions`,
// entrega MP3 (no OGG), y lee en voz alta TODO lo que se le mande: solo el texto exacto, sin instrucciones.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { AvisoGemini, Tarjeta, guionAudioAlerta, tarjetaParaAlerta } from "@/contratos/tipos";
import { huellaContenido } from "@/lib/tarjeta-publica";
import { RAIZ, clienteSupabase, falla } from "./_comun";

const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const tiene = (n: string) => process.argv.includes(n);

const CARPETA = path.join(RAIZ, "assets", "audio");
const MODELO = process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-tts";
const VOZ = arg("--voz") ?? "Kore";
const CLAVE_ALERTA = "altiplano-2026-11-2"; // la clave que usa lib/boletin.ts para el boletín del demo
const FIXTURE_ALERTA = path.join(RAIZ, "fixtures", `aviso-${CLAVE_ALERTA}.json`);

function ffmpeg(args: string[]) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8" });
  if (r.error) falla("No se encontró ffmpeg en el PATH (instálalo: winget install Gyan.FFmpeg)");
  if (r.status !== 0) throw new Error(`ffmpeg falló: ${r.stderr}`);
}

function duracion(archivo: string): string {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo], { encoding: "utf8" });
  const s = Number(r.stdout?.trim());
  return Number.isFinite(s) ? `${s.toFixed(1)} s` : "?";
}

async function hablar(ai: GoogleGenAI, texto: string): Promise<Buffer> {
  const r = await ai.interactions.create({
    model: MODELO,
    input: texto,
    response_format: { type: "audio", mime_type: "audio/mp3" },
    generation_config: { speech_config: [{ voice: VOZ, language: "es" }] },
  });
  const datos = r.output_audio?.data;
  if (!datos) throw new Error("Gemini no devolvió audio");
  return Buffer.from(datos, "base64");
}

/** Escribe <base>.mp3 (64k) y <base>.ogg (Opus mono 32k) a partir del MP3 de Gemini. */
async function generar(ai: GoogleGenAI, texto: string, base: string) {
  mkdirSync(path.dirname(base), { recursive: true });
  const crudo = `${base}.tts.mp3`;
  writeFileSync(crudo, await hablar(ai, texto));
  try {
    ffmpeg(["-i", crudo, "-ac", "1", "-b:a", "64k", `${base}.mp3`]);
    ffmpeg(["-i", crudo, "-c:a", "libopus", "-ac", "1", "-b:a", "32k", "-application", "voip", `${base}.ogg`]);
  } finally {
    rmSync(crudo, { force: true });
  }
  const dur = duracion(`${base}.ogg`);
  console.log(`  ✔ ${path.relative(RAIZ, base)}.mp3 / .ogg  (${dur})`);
  if (parseFloat(dur) > 35) console.warn("    ⚠ dura más de 30 s: revisar que no lea algo de más");
}

/** El guion debe decir el título y los 3 pasos EXACTOS de la tarjeta (si el texto cambió, el guion está viejo). */
function revisarGuion(t: Tarjeta, guion: string | undefined): string[] {
  if (!guion) return ["no hay guion en data/tarjetas/guiones_audio.json"];
  const faltan = [t.title, ...t.steps].filter((x) => !guion.includes(x.replace(/\.$/, "")));
  return faltan.map((x) => `el guion no contiene: "${x}"`);
}

async function main() {
  const sb = clienteSupabase(); // también carga .env
  if (!process.env.GEMINI_API_KEY) falla("Falta GEMINI_API_KEY en .env");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: "v1beta" });
  const { data, error } = await sb.from("lessons").select("*").order("id");
  if (error) falla(`No se pudo leer lessons: ${error.message}`);
  const tarjetas = (data ?? []).map((f) => Tarjeta.parse({ ...f, source_url: f.source_url ?? undefined }));

  if (tiene("--alerta")) {
    const id = tarjetaParaAlerta("helada");
    const t = tarjetas.find((x) => x.id === id);
    if (!t || (t.status === "borrador" && !tiene("--incluir-borrador"))) {
      falla(`La tarjeta de la alerta (${id}) debe estar verificada antes de grabar el audio de la alerta.`);
    }
    const aviso = AvisoGemini.parse(JSON.parse(readFileSync(FIXTURE_ALERTA, "utf8")).aviso);
    // v0.4: el mismo guion que usa la aprobación en el panel (guionAudioAlerta, ~20 s, sin enlace ni la línea
    // de voz sintética: la declaración va ESCRITA en el mensaje).
    const texto = guionAudioAlerta(aviso, t);
    console.log(`Alerta ${CLAVE_ALERTA}:\n---\n${texto}\n---`);
    const base = path.join(CARPETA, "alertas", CLAVE_ALERTA);
    if (existsSync(`${base}.ogg`) && !tiene("--rehacer")) return console.log("  · ya existe (usa --rehacer para pisarlo)");
    await generar(ai, texto, base);
    return;
  }

  const guiones: Record<string, string> = JSON.parse(readFileSync(path.join(RAIZ, "data", "tarjetas", "guiones_audio.json"), "utf8"));
  const pedidas = arg("--ids")?.split(",").map((s) => s.trim());
  const objetivo = tarjetas.filter((t) => !pedidas || pedidas.includes(t.id));
  let errores = 0;
  for (const t of objetivo) {
    if (t.status === "borrador" && !tiene("--incluir-borrador")) {
      console.log(`· ${t.id}: en borrador → no se graba (primero verificar)`);
      continue;
    }
    const base = path.join(CARPETA, `${t.id}-${huellaContenido(t)}`);
    if (existsSync(`${base}.ogg`) && existsSync(`${base}.mp3`) && !tiene("--rehacer")) {
      console.log(`· ${t.id}: ya tiene audio local (usa --rehacer para pisarlo)`);
      continue;
    }
    const problemas = revisarGuion(t, guiones[t.id]);
    if (problemas.length) {
      console.error(`✖ ${t.id}: ${problemas.join("; ")}`);
      errores++;
      continue;
    }
    console.log(t.id);
    try {
      await generar(ai, guiones[t.id], base);
    } catch (e) {
      console.error(`✖ ${t.id}: ${e instanceof Error ? e.message : e}`);
      errores++;
    }
  }
  console.log("\nSiguiente: escuchar cada audio completo y luego `npm run subir:audios`.");
  if (errores) process.exitCode = 1;
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
