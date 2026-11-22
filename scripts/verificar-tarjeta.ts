// Registra en data/tarjetas/tarjetas.json (y .csv) el resultado de la verificación de una tarjeta.
// No toca la base: después hay que correr `npm run seed:lecciones`.
//
//   npm run verificar:tarjeta -- <id> --por "<nombre>"        → verificada (la cotejó <nombre>)
//   npm run verificar:tarjeta -- <id> --revisada "<técnico>"  → revisada (debe estar verificada y sin cambios)
//   npm run verificar:tarjeta -- <id> --borrador              → vuelve a borrador (tras corregir el texto)
//   npm run verificar:tarjeta -- --estado                     → estado de las 6 y si la verificación sigue vigente
//
// Al verificar guarda `verified_hash` = huella del título, los pasos y las fuentes en ese momento.
// Si alguien corrige el texto después, el seed rechaza la tarjeta hasta que se verifique de nuevo.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Tarjeta } from "@/contratos/tipos";
import { problemasDeVerificacion } from "@/lib/tarjeta-contenido";
import { huellaVerificacion } from "@/lib/tarjeta-publica";
import { RAIZ, falla } from "./_comun";

const JSON_TARJETAS = path.join(RAIZ, "data", "tarjetas", "tarjetas.json");
const CSV_TARJETAS = path.join(RAIZ, "data", "tarjetas", "tarjetas.csv");
const COLUMNAS_CSV = ["id", "hazard", "phase", "title", "paso_1", "paso_2", "paso_3", "factor_tags", "source_doc",
  "source_page", "author", "verified_by", "reviewed_by", "status"];

type Fila = Record<string, unknown> & { id: string };

const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** Conserva el formato del archivo original (saltos CRLF/LF y salto final) para no ensuciar el diff. */
function escribirConFormato(archivo: string, original: string, contenido: string) {
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const final = /\r?\n$/.test(original) ? eol : "";
  writeFileSync(archivo, contenido.replace(/\r?\n/g, eol) + final);
}

function csvDe(filas: Fila[]): string {
  const q = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = filas.map((f) => {
    const steps = f.steps as string[];
    return [f.id, f.hazard, f.phase, f.title, steps[0], steps[1], steps[2], (f.factor_tags as string[]).join("|"),
      f.source_doc, f.source_page, f.author, f.verified_by, f.reviewed_by, f.status].map(q).join(",");
  });
  return [COLUMNAS_CSV.join(","), ...lineas].join("\n");
}

/** Copia la fila poniendo verified_hash justo después de verified_by (o quitándolo si es null). */
function conHuella(f: Fila, huella: string | null): Fila {
  const salida: Fila = { id: f.id };
  for (const [k, v] of Object.entries(f)) {
    if (k === "verified_hash") continue;
    salida[k] = v;
    if (k === "verified_by" && huella) salida.verified_hash = huella;
  }
  return salida;
}

function main() {
  const originalJson = readFileSync(JSON_TARJETAS, "utf8");
  const originalCsv = readFileSync(CSV_TARJETAS, "utf8");
  const filas = JSON.parse(originalJson) as Fila[];

  if (process.argv.includes("--estado")) {
    for (const f of filas) {
      const t = Tarjeta.parse(f);
      const p = problemasDeVerificacion(t, f.verified_hash);
      const vigencia = t.status === "borrador" ? "" : p.length ? "  ✖ verificación NO vigente (cambió el texto)" : "  ✔ vigente";
      console.log(`${t.id.padEnd(26)} ${t.status.padEnd(10)} ${t.verified_by ?? "-"}${vigencia}`);
    }
    return;
  }

  // El id es el primer argumento suelto (no una opción ni el valor de --por / --revisada).
  const args = process.argv.slice(2);
  const id = args.find((a, k) => !a.startsWith("--") && !["--por", "--revisada"].includes(args[k - 1]));
  if (!id) falla('Uso: npm run verificar:tarjeta -- <id> --por "<nombre>" | --revisada "<técnico>" | --borrador | --estado');
  const i = filas.findIndex((f) => f.id === id);
  if (i < 0) falla(`No existe la tarjeta "${id}". Ids: ${filas.map((f) => f.id).join(", ")}`);
  const actual = Tarjeta.parse(filas[i]);
  const huella = huellaVerificacion(actual);
  let nueva: Fila;

  if (process.argv.includes("--borrador")) {
    nueva = conHuella({ ...filas[i], status: "borrador", verified_by: null, reviewed_by: null }, null);
  } else if (arg("--revisada")) {
    const tecnico = arg("--revisada")!.trim();
    if (actual.status === "borrador") falla(`${id} sigue en borrador: primero verifícala con --por "<nombre>".`);
    const p = problemasDeVerificacion(actual, filas[i].verified_hash);
    if (p.length) falla(`${id}: ${p.join("; ")}`);
    nueva = conHuella({ ...filas[i], status: "revisada", reviewed_by: tecnico }, huella);
  } else if (arg("--por")) {
    const persona = arg("--por")!.trim();
    if (!persona) falla("Falta el nombre después de --por");
    nueva = conHuella({ ...filas[i], status: "verificada", verified_by: persona, reviewed_by: null }, huella);
  } else {
    falla('Indica qué hacer: --por "<nombre>", --revisada "<técnico>" o --borrador');
  }

  const r = Tarjeta.safeParse(nueva);
  if (!r.success) falla(`${id} no valida: ${r.error.issues.map((x) => x.message).join("; ")}`);
  filas[i] = nueva;
  escribirConFormato(JSON_TARJETAS, originalJson, JSON.stringify(filas, null, 2));
  escribirConFormato(CSV_TARJETAS, originalCsv, csvDe(filas));

  console.log(`✔ ${id}: ${String(nueva.status)}${nueva.verified_by ? ` (verificó ${String(nueva.verified_by)})` : ""}` +
    `${nueva.reviewed_by ? ` (revisó ${String(nueva.reviewed_by)})` : ""}${nueva.verified_hash ? ` · huella ${String(nueva.verified_hash)}` : ""}`);
  console.log("  Actualizados data/tarjetas/tarjetas.json y tarjetas.csv. Siguiente: npm run seed:lecciones");
}

main();
