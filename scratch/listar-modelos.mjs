// Lista los modelos disponibles para la clave (no gasta cuota de generación).
// Uso (dentro de /scratch): node --env-file=../.env listar-modelos.mjs [v1beta]
import { GoogleGenAI } from "@google/genai";
const apiVersion = process.argv[2];
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, ...(apiVersion ? { apiVersion } : {}) });
const nombres = [];
for await (const m of await ai.models.list({ config: { pageSize: 200 } })) nombres.push(`${m.name}  [${(m.supportedActions ?? []).join(",")}]`);
console.log(nombres.join(String.fromCharCode(10)));
console.log(`Total: ${nombres.length}${apiVersion ? ` (api ${apiVersion})` : ""}`);
