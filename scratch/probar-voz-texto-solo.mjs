// Igual que probar-voz.mjs pero SIN instrucción de estilo: solo el texto exacto (1 llamada, MP3).
import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "node:fs";
const [carpeta = ".", voz = "Kore"] = process.argv.slice(2);
const texto = "Hace seis días que la vertiente está seca, somos como cuarenta familias, las llamas están flacas.";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: "v1beta" });
const t0 = Date.now();
const r = await ai.interactions.create({
  model: process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-tts",
  input: texto,
  response_format: { type: "audio", mime_type: "audio/mp3" },
  generation_config: { speech_config: [{ voice: voz, language: "es" }] },
});
const a = r.output_audio ?? r.outputs?.find?.((o) => o.type === "audio");
writeFileSync(`${carpeta}/voz-solo.mp3`, Buffer.from(a.data, "base64"));
console.log(`OK  voz ${voz} · ${Date.now() - t0} ms`);
