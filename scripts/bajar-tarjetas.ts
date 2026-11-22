// Trae a data/tarjetas/tarjetas.json lo que se publicó o retiró desde el editor del panel.
//   npm run tarjetas:bajar
// Desde que existe el editor, la base manda: el JSON es la copia en el repo. Correr esto ANTES de seed:lecciones,
// o el seed se detiene para no pisar una edición hecha en el panel.
// Escribe verified_hash = huella del contenido (la verificación la hizo quien figura en verified_by en el panel).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Tarjeta } from "@/contratos/tipos";
import { huellaVerificacion } from "@/lib/tarjeta-publica";
import { RAIZ, clienteSupabase, falla } from "./_comun";

const ARCHIVO = path.join(RAIZ, "data", "tarjetas", "tarjetas.json");
const CAMPOS = [
  "id", "hazard", "phase", "title", "steps", "step_sources", "por_que", "evitar", "pedir_ayuda", "factor_tags",
  "source_doc", "source_page", "source_url", "author", "verified_by", "reviewed_by", "status",
] as const;

async function main() {
  const sb = clienteSupabase();
  const { data: versiones, error: ev } = await sb.from("lesson_versions").select("lesson_id").in("estado", ["publicada", "retiro"]);
  if (ev) falla(`Falta la migración del editor (${ev.message})`);
  const ids = [...new Set((versiones ?? []).map((v) => v.lesson_id as string))];
  if (!ids.length) return console.log("No hay cambios hechos desde el panel.");

  const { data: filas, error } = await sb.from("lessons").select("*").in("id", ids);
  if (error) falla(error.message);
  const original = readFileSync(ARCHIVO, "utf8");
  const crlf = original.includes("\r\n");
  const lista = JSON.parse(original) as Record<string, unknown>[];

  for (const fila of filas ?? []) {
    const t = Tarjeta.parse({ ...fila, source_url: fila.source_url ?? undefined });
    const entrada: Record<string, unknown> = {};
    for (const c of CAMPOS) {
      const v = (t as Record<string, unknown>)[c];
      if (v === undefined || (["por_que", "evitar", "pedir_ayuda", "source_url"].includes(c) && v === null)) continue;
      entrada[c] = v;
      if (c === "verified_by" && t.status !== "borrador") entrada.verified_hash = huellaVerificacion(t);
    }
    const i = lista.findIndex((x) => x.id === t.id);
    if (i >= 0) lista[i] = entrada; else lista.push(entrada);
    console.log(`✔ ${t.id} (${t.status}${t.verified_by ? `, ${t.verified_by}` : ""})`);
  }
  const salida = JSON.stringify(lista, null, 2);
  writeFileSync(ARCHIVO, (crlf ? salida.replace(/\n/g, "\r\n") : salida) + (crlf ? "\r\n" : "\n"));
  console.log("Listo. Revisa el cambio con git diff y súbelo.");
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
