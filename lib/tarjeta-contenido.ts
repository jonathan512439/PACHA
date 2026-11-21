// Reglas de contenido de las tarjetas (puras). Las usan el seed y las pruebas.
// No reescriben nada: solo detectan texto que NO puede salir (dosis, medicamentos, frases vetadas).
import { contarPalabras, type Tarjeta } from "@/contratos/tipos";
import { huellaContenido } from "@/lib/tarjeta-publica";

/** Patrones prohibidos en cualquier texto visible de la tarjeta. */
export const PROHIBIDOS: { motivo: string; patron: RegExp }[] = [
  { motivo: "dosis", patron: /\bdosis\b/i },
  { motivo: "unidad de dosis", patron: /\b\d+([.,]\d+)?\s*(mg|ml|cc|ui|g\/kg|mg\/kg|ml\/kg)\b/i },
  { motivo: "unidad de dosis", patron: /\b(mg|ml|cc)\b/i },
  { motivo: "medicamento", patron: /\b(medicamento|medicina|f[áa]rmaco|antibi[óo]tico|antiparasitario|desparasitante|vacuna|inyecci[óo]n|inyecta|inyectar)\w*/i },
  {
    motivo: "nombre de medicamento",
    patron: /\b(ivermectina|albendazol|fenbendazol|triclabendazol|closantel|levamisol|oxitetraciclina|penicilina|enrofloxacina|doramectina|abamectina|sulfa\w*|vitamina\s+[a-z]\d*)\b/i,
  },
  { motivo: "frase vetada", patron: /reduce\s+el\s+tama[ñn]o\s+del\s+hato/i },
];

/** Todos los textos visibles: título y pasos (las fuentes son citas bibliográficas, no consejos). */
const textosVisibles = (t: Pick<Tarjeta, "title" | "steps">) => [t.title, ...t.steps];

/**
 * `author` = autor del texto o guía de origen (decisiones.md, "regla de autoría corregida").
 * Cada parte de `author` separada por ";" debe aparecer en alguna fuente de los pasos,
 * y nunca puede ser el equipo ni la IA (p. ej. "… con asistencia de IA").
 */
export function problemasDeAutor(t: Pick<Tarjeta, "author" | "step_sources">): string[] {
  const problemas: string[] = [];
  if (/\bIA\b|asistencia|inteligencia artificial|equipo/i.test(t.author)) {
    problemas.push(`author debe ser el autor de la guía, no el equipo ni la IA: "${t.author}"`);
  }
  const docs = (t.step_sources ?? []).map((f) => f.doc.toLowerCase());
  for (const parte of t.author.split(";").map((p) => p.trim()).filter(Boolean)) {
    if (!docs.some((d) => d.includes(parte.toLowerCase()))) {
      problemas.push(`author "${parte}" no aparece en ninguna fuente de los pasos`);
    }
  }
  return problemas;
}

export function problemasDeContenido(t: Pick<Tarjeta, "id" | "title" | "steps" | "step_sources" | "author">): string[] {
  const problemas: string[] = [...problemasDeAutor(t)];
  for (const texto of textosVisibles(t)) {
    for (const { motivo, patron } of PROHIBIDOS) {
      if (patron.test(texto)) problemas.push(`${motivo}: "${texto}"`);
    }
  }
  t.steps.forEach((paso, i) => {
    if (contarPalabras(paso) > 18) problemas.push(`paso ${i + 1} tiene ${contarPalabras(paso)} palabras (máx. 18)`);
    const f = t.step_sources?.[i];
    if (!f || !f.doc?.trim() || !f.page?.trim()) problemas.push(`paso ${i + 1} sin fuente o sin página`);
  });
  return problemas;
}

/**
 * La verificación queda atada al texto: una tarjeta `verificada`/`revisada` debe traer en tarjetas.json
 * `verified_hash` = huellaContenido (título, pasos y fuentes) del momento en que se verificó.
 * Si alguien corrige el texto después, la huella deja de coincidir y el seed no la carga.
 * `verified_hash` lo escribe `npm run verificar:tarjeta`; no se edita a mano.
 */
export function problemasDeVerificacion(
  t: Pick<Tarjeta, "id" | "status" | "title" | "steps" | "step_sources">,
  verifiedHash: unknown,
): string[] {
  if (t.status === "borrador") return [];
  if (typeof verifiedHash !== "string" || !verifiedHash) {
    return [`está "${t.status}" pero sin verified_hash: márcala con \`npm run verificar:tarjeta -- ${t.id} --por "<nombre>"\``];
  }
  if (verifiedHash !== huellaContenido(t)) {
    return [
      `el título, los pasos o las fuentes cambiaron DESPUÉS de verificarla. Vuelve a borrador ` +
        `(\`npm run verificar:tarjeta -- ${t.id} --borrador\`), que otra persona la coteje de nuevo y márcala otra vez`,
    ];
  }
  return [];
}
