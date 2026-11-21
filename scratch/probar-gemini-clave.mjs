// Prueba mínima de la clave de Gemini (1 petición). Uso: node --env-file=../.env probar-gemini-clave.mjs
import { GoogleGenAI } from "@google/genai";
const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const t0 = Date.now();
try {
  const r = await ai.models.generateContent({ model, contents: "Responde exactamente con la palabra: OK" });
  console.log(`OK   modelo ${model} respondió "${r.text?.trim()}" en ${Date.now() - t0} ms`);
} catch (e) {
  console.log(`ERR  modelo ${model}: ${String(e?.message ?? e).slice(0, 300)}`);
  process.exit(1);
}
