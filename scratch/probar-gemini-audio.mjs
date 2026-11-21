// Prueba desechable (sáb 13:00): ¿Gemini acepta sin convertir los audios que nos llegarán?
//   - Nota de voz de WhatsApp/Telegram: OGG/Opus (.ogg / .oga / .opus)
//   - Grabación del navegador en /probar: WebM/Opus (.webm), o MP4/AAC en Safari antiguo (.mp4/.m4a)
//   - Control: WAV (.wav), que Gemini lista como soportado
// Uso (dentro de /scratch):
//   npm i @google/genai
//   GEMINI_API_KEY=xxx node probar-gemini-audio.mjs nota.ogg grabacion.webm control.wav
// Para grabar en el navegador: abrir scratch/grabar.html en Chrome (y, si se puede, en Safari del celular).
import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const archivos = process.argv.slice(2);
if (archivos.length === 0) throw new Error("Pasa al menos un archivo de audio");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

// MIME candidatos por extensión: se prueba primero el "natural" y luego alternativas.
const CANDIDATOS = {
  ".ogg": ["audio/ogg", "audio/ogg; codecs=opus", "audio/opus"],
  ".oga": ["audio/ogg", "audio/opus"],
  ".opus": ["audio/ogg", "audio/opus"],
  ".webm": ["audio/webm", "audio/webm; codecs=opus", "audio/ogg"],
  ".mp4": ["audio/mp4", "audio/aac"],
  ".m4a": ["audio/mp4", "audio/aac"],
  ".wav": ["audio/wav"],
  ".mp3": ["audio/mp3", "audio/mpeg"],
};

const resumen = [];
for (const archivo of archivos) {
  const ext = extname(archivo).toLowerCase();
  const data = readFileSync(archivo).toString("base64");
  for (const mimeType of CANDIDATOS[ext] ?? ["application/octet-stream"]) {
    const t0 = Date.now();
    try {
      const r = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType, data } },
          { text: "Transcribe este audio literalmente. En una segunda línea indica el idioma (es/qu/ay/mixto)." },
        ] }],
      });
      const ms = Date.now() - t0;
      console.log(`OK  ${archivo}  ${mimeType}  ${ms} ms\n${r.text}\n`);
      resumen.push(`OK   ${archivo} -> ${mimeType} (${ms} ms)`);
      break; // con que un MIME funcione basta
    } catch (e) {
      console.log(`ERR ${archivo}  ${mimeType}  ${e?.message ?? e}\n`);
      resumen.push(`ERR  ${archivo} -> ${mimeType}`);
    }
  }
}
console.log("==== RESUMEN (copiar en decisiones.md) ====\n" + resumen.join("\n"));
