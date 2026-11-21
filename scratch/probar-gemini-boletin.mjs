// Prueba desechable (sáb 13:00, gemela de probar-gemini-audio.mjs):
// extracción AvisoGemini v0.2 sobre el boletín REAL del Senamhi (Altiplano, 14–23 nov 2026).
// Uso (dentro de /scratch):
//   npm i @google/genai zod@^4
//   GEMINI_API_KEY=xxx node probar-gemini-boletin.mjs senamhi_altiplano_2026-11-14_2026-11-23.pdf
// El PDF está en Drive (DATOSPROYECTO) o en:
//   https://senamhi.gob.bo/agromet/boletines_agrometeorologia/boletines_decenales/2026/NOVIEMBRE/2%20DECENA/1%20BOLET%C3%ADN%20ALTIPLANO%202026-11-2.pdf
// Guarda el resultado en scratch/fixtures/aviso-altiplano-2026-11-2.json (fixture para DEMO_FIXTURES).
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const pdfPath = process.argv[2] ?? "senamhi_altiplano_2026-11-14_2026-11-23.pdf";
const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Borrador de AvisoGemini v0.2 (A lo pasa a /contratos/tipos.ts). Las citas son LITERALES.
const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const AvisoGemini = z.object({
  encontrado: z.boolean(),
  zona: z.string().nullable(),                 // p. ej. "Altiplano Central"
  estacion: z.string().nullable(),             // p. ej. "Oruro-Ciudad"
  periodo_inicio: fechaISO.nullable(),
  periodo_fin: fechaISO.nullable(),
  fenomeno: z.enum(["helada", "nevada", "sequia", "ninguno"]),
  temp_minima_c: z.number().nullable(),
  // v0.2.1: primero las citas literales y después el nivel (el modelo genera en este orden)
  cita_evento: z.string().max(200).nullable(), // frase literal del evento/amenaza
  cita_riesgo: z.string().max(200).nullable(), // frase literal del riesgo DE HELADA
  riesgo_helada: z.enum(["bajo", "medio", "alto"]).nullable(), // debe coincidir con cita_riesgo
  nivel_senamhi: z.enum(["amarillo", "naranja", "rojo"]).nullable(),
  confianza: z.number().min(0).max(1),
});

const prompt = `Eres un extractor de datos. NO opinas ni recomiendas.
Del boletín agrometeorológico adjunto, extrae SOLO la información de la zona que incluye a Oruro (Altiplano Central).
- fenomeno: la amenaza principal para esa zona entre helada, nevada, sequia o ninguno.
- cita_evento: copia LITERAL (máximo 200 caracteres) de la frase que describe el evento para esa zona.
- cita_riesgo: copia LITERAL (máximo 200 caracteres) de la frase de riesgo que menciona la HELADA
  (por ejemplo "Riesgo ... por helada ..."). En la tabla de riesgos cada fila trata una amenaza distinta:
  ignora las filas de riesgo por viento, erosión, deshidratación o granizo si no nombran la helada.
- riesgo_helada: el nivel que aparece DENTRO de cita_riesgo (debe coincidir con ella). Si la cita da un rango
  como "MEDIO A ALTO", usa el valor superior ("alto"). Si no hay frase de riesgo por helada, null.
- temp_minima_c: la mínima indicada para esa zona o sus estaciones (no la de toda la macrorregión).
- nivel_senamhi: solo si el boletín usa explícitamente alerta amarilla, naranja o roja; si no, null.
- Fechas en formato AAAA-MM-DD.`;

const t0 = Date.now();
const r = await ai.models.generateContent({
  model,
  contents: [{ role: "user", parts: [
    { inlineData: { mimeType: "application/pdf", data: readFileSync(pdfPath).toString("base64") } },
    { text: prompt },
  ] }],
  config: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(AvisoGemini) },
});
const ms = Date.now() - t0;
const aviso = AvisoGemini.parse(JSON.parse(r.text)); // si no valida, lanza: eso también es un resultado

// Lo esperado según la lectura humana del sáb 21/11 (docs/mvp.md M2):
// riesgo de HELADA en Altiplano Central = MEDIO ("Riesgo MEDIO por helada tardía y granizadas aisladas...").
// El "MEDIO A ALTO" de esa fila es por VIENTO/deshidratación de plántulas: si sale "alto", Gemini confundió las filas.
// Igual que riesgoDesdeCita() en contratos/tipos.ts: el CÓDIGO lee el nivel desde la cita literal.
const riesgoDesdeCita = (c) => {
  if (!c || !/helad/i.test(c)) return null;
  const m = c.match(/riesgo\s+(bajo|medio|alto)(?:\s+a\s+(bajo|medio|alto))?/i);
  return m ? (m[2] ?? m[1]).toLowerCase() : null;
};
const deCita = riesgoDesdeCita(aviso.cita_riesgo);
const checks = [
  ["riesgo leído por el CÓDIGO desde cita_riesgo = medio (lo que usa decidirAlerta)", deCita === "medio"],
  [`campo riesgo_helada de Gemini coincide con la cita (informativo: "${aviso.riesgo_helada}")`, aviso.riesgo_helada === deCita],
  ["temp_minima_c = 1 (mínima de Oruro, no de la macrorregión)", aviso.temp_minima_c === 1],
  ["zona contiene 'Central'", /central/i.test(aviso.zona ?? "")],
  ["fenomeno = helada", aviso.fenomeno === "helada"],
  ["periodo 2026-11-14 a 2026-11-23", aviso.periodo_inicio === "2026-11-14" && aviso.periodo_fin === "2026-11-23"],
  ["cita_evento menciona 1 °C o punto de congelación", /1 ?°C|congelaci/i.test(aviso.cita_evento ?? "")],
];

// Comprobación literal de las citas contra el texto del PDF (si hay pdftotext en la máquina).
const norm = (s) => s.normalize("NFC").replace(/\s+/g, " ").toLowerCase();
const txt = spawnSync("pdftotext", ["-enc", "UTF-8", pdfPath, "-"], { encoding: "utf8" });
if (txt.status === 0) {
  const cuerpo = norm(txt.stdout);
  for (const k of ["cita_evento", "cita_riesgo"]) {
    if (aviso[k]) checks.push([`${k} aparece literal en el PDF`, cuerpo.includes(norm(aviso[k]))]);
  }
} else {
  checks.push(["(pdftotext no disponible: verificar las citas a mano)", true]);
}

mkdirSync("fixtures", { recursive: true });
const fixture = { modelo: model, generado: new Date().toISOString(), ms, fuente: pdfPath, aviso };
writeFileSync("fixtures/aviso-altiplano-2026-11-2.json", JSON.stringify(fixture, null, 2));

console.log(JSON.stringify(aviso, null, 2));
console.log(`\n${ms} ms · modelo ${model}\n==== CHEQUEOS ====`);
for (const [n, ok] of checks) console.log(`${ok ? "OK " : "ERR"}  ${n}`);
console.log("\nFixture guardado en scratch/fixtures/aviso-altiplano-2026-11-2.json");
