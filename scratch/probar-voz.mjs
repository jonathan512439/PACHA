// Prueba desechable: ¿Gemini genera la voz que necesitamos, en los formatos que necesitamos?
// Usa la API "interactions" del SDK (la de generateContent + speechConfig fue rechazada el sáb 21/11).
// Uso (dentro de /scratch): node --env-file=../.env probar-voz.mjs <carpeta_salida> [voz]
// Pide el MISMO texto en OGG/Opus (WhatsApp/Telegram) y en MP3 (web): 2 llamadas.
import { GoogleGenAI } from "@google/genai";
import { writeFileSync, mkdirSync } from "node:fs";

const carpeta = process.argv[2] ?? "salida-voz";
const voz = process.argv[3] ?? "Kore";
const modelo = process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-tts"; // los modelos TTS solo existen en v1beta
mkdirSync(carpeta, { recursive: true });

// Línea del guion (reporte): sirve también para probar si Gemini transcribe estos audios.
const texto = "Hace seis días que la vertiente está seca, somos como cuarenta familias, las llamas están flacas.";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: "v1beta" });

for (const [mime, archivo] of [["audio/ogg_opus", "nota.ogg"], ["audio/mp3", "voz.mp3"]]) {
  const t0 = Date.now();
  try {
    const r = await ai.interactions.create({
      model: modelo,
      input: `Lee con voz clara, calmada y pausada, en español de Bolivia: ${texto}`,
      response_format: { type: "audio", mime_type: mime },
      generation_config: { speech_config: [{ voice: voz, language: "es" }] },
    });
    // La salida de audio puede venir en output_audio o dentro de outputs[].
    const audio = r.output_audio ?? r.outputs?.find?.((o) => o.type === "audio") ?? null;
    if (!audio?.data) {
      console.log(`ERR ${mime}: sin audio. Claves de la respuesta: ${Object.keys(r).join(", ")}`);
      continue;
    }
    const buf = Buffer.from(audio.data, "base64");
    writeFileSync(`${carpeta}/${archivo}`, buf);
    console.log(`OK  ${mime} -> ${archivo} · ${(buf.length / 1024).toFixed(0)} KB · devuelto como "${audio.mime_type}" · ${Date.now() - t0} ms`);
  } catch (e) {
    console.log(`ERR ${mime}: ${String(e?.message ?? e).slice(0, 300)}`);
  }
}
