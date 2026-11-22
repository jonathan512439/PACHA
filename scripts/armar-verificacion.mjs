// Arma la HOJA DE VERIFICACIÓN de las tarjetas: para cada paso, extrae el texto de la página citada del PDF
// y propone los fragmentos que más se parecen al paso. La persona que verifica solo confirma o rechaza.
//   node scripts/armar-verificacion.mjs            (solo las tarjetas en borrador)
//   node scripts/armar-verificacion.mjs --todas    (todas)
// Entrada: data/tarjetas/tarjetas.json + fuentes en scratch/verificacion/fuentes/ (PDF, o .txt para páginas web)
// v0.4: además de los pasos, coteja "por qué importa", cada "evita" y "pide ayuda si…".
// Salida:  scratch/verificacion/verificacion-tarjetas.md   (IGNORADA por git: contiene citas literales)
// Requiere pdftotext (poppler). NO decide nada: un fragmento parecido no prueba que el paso esté respaldado.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const FUENTES = path.join(RAIZ, "scratch", "verificacion", "fuentes");
const SALIDA = path.join(RAIZ, "scratch", "verificacion", "verificacion-tarjetas.md");
// Un "doc" citado corresponde a cada entrada cuyo patrón coincide (un paso puede citar dos: "Senamhi… / CIPCA…").
// web: true = página web guardada como texto (extracto literal): se busca en todo el archivo, sin páginas.
const DOCS = {
  senamhi: { archivo: "senamhi.pdf", patron: /senamhi/i, nombre: "Boletín Senamhi–INSA Altiplano, 14–23 nov 2026" },
  caylloma: { archivo: "al927s.pdf", patron: /caylloma/i, nombre: "FAO, Buenas Prácticas en Caylloma (al927s)" },
  ugr: { archivo: "a-as967s.pdf", patron: /unidad municipal/i, nombre: "FAO Bolivia, Cartilla Unidad Municipal de Gestión del Riesgo (a-as967s)" },
  alpacas: { archivo: "w3341s02.pdf", patron: /alpacas y llamas/i, nombre: "FAO, Manual de manejo de alpacas y llamas, cap. 4 (w3341s02)" },
  fao: { archivo: "fao.pdf", patron: /yapuchiris/i, nombre: "FAO, Sistematización de buenas prácticas (TCP/RLA/3217)" },
  cipca: { archivo: "cipca.pdf", patron: /cipca/i, nombre: "CIPCA, Propuestas de respuesta integral a la sequía (nov 2024)" },
  cdcHervir: { archivo: "cdc-hervir.txt", web: true, patron: /agua sea segura/i, nombre: "CDC, Cómo hacer que el agua sea segura en caso de emergencia (web)" },
  cdcGuardar: { archivo: "cdc-guardar.txt", web: true, patron: /almacenamiento seguro/i, nombre: "CDC, Almacenamiento seguro del agua (web)" },
};

const VACIAS = new Set(("para como cuando donde desde hasta sobre entre ante tras antes durante despues después solo sólo tambien también " +
  "muy mas más menos este esta estos estas ese esa eso una uno unos unas los las del con por sin que sus tus sea son hay haz " +
  "puede pueden debe deben cada todo toda todos todas otro otra otros otras").split(" "));
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Raíces de 5 letras de las palabras con contenido (tolera conjugaciones: "aporque" ~ "aporcar" no, pero "siembra" ~ "siembras" sí). */
const raices = (s) => [...new Set(norm(s).split(/[^a-zñ]+/).filter((w) => w.length >= 4 && !VACIAS.has(w)).map((w) => w.slice(0, 5)))];

const cache = new Map();
function pagina(clave, n) {
  const k = `${clave}:${n}`;
  if (cache.has(k)) return cache.get(k);
  const pdf = path.join(FUENTES, DOCS[clave].archivo);
  let texto = null;
  if (DOCS[clave].web) texto = existsSync(pdf) ? readFileSync(pdf, "utf8") : null;
  else if (existsSync(pdf)) {
    const r = spawnSync("pdftotext", ["-enc", "UTF-8", "-f", String(n), "-l", String(n), pdf, "-"], { encoding: "utf8" });
    if (r.error) { console.error("✖ No se encontró pdftotext (instala poppler)"); process.exit(1); }
    texto = r.status === 0 ? r.stdout : null;
  }
  cache.set(k, texto);
  return texto;
}

/** "Senamhi p. 7 (Altiplano Sur); CIPCA p. 8" -> [{clave:"senamhi", paginas:[7]}, {clave:"cipca", paginas:[8]}] */
function referencias(fuente) {
  const docs = Object.entries(DOCS).filter(([, d]) => d.patron.test(fuente.doc)).map(([k]) => k);
  if (docs.length === 1 && DOCS[docs[0]].web) return [{ clave: docs[0], paginas: [0] }]; // web: todo el texto
  return fuente.page.split(";").map((seg) => {
    const clave = docs.find((k) => DOCS[k].patron.test(seg)) ?? docs[0];
    // Sin lo que va entre paréntesis: "p. 14 del PDF (p. 67 impresa)" -> 14 · "p. 7 (Altiplano Sur)" -> 7
    const limpio = seg.replace(/\([^)]*\)/g, "");
    return { clave, paginas: [...limpio.matchAll(/\d+/g)].map((m) => Number(m[0])).filter((n) => n > 0 && n < 400) };
  }).filter((r) => r.clave && r.paginas.length);
}

/** Fragmentos (oraciones o renglones unidos) de la página, ordenados por cuántas raíces del paso contienen. */
function candidatos(texto, paso) {
  const objetivo = raices(paso);
  const trozos = texto.replace(/-\n/g, "").replace(/\s*\n\s*/g, " ").split(/(?<=[.;:])\s+|\s{3,}/).map((t) => t.trim()).filter((t) => t.length > 15);
  return trozos.map((t) => {
    const r = new Set(raices(t));
    const coinciden = objetivo.filter((x) => r.has(x));
    return { t, coinciden, puntaje: objetivo.length ? coinciden.length / objetivo.length : 0 };
  }).filter((c) => c.coinciden.length > 0).sort((a, b) => b.puntaje - a.puntaje || a.t.length - b.t.length).slice(0, 2);
}

const resaltar = (t, coinciden) => t.split(/(\s+)/).map((w) => (coinciden.includes(norm(w).replace(/[^a-zñ]/g, "").slice(0, 5)) && norm(w).replace(/[^a-zñ]/g, "").length >= 4 ? `**${w}**` : w)).join("");

const tarjetas = JSON.parse(readFileSync(path.join(RAIZ, "data", "tarjetas", "tarjetas.json"), "utf8"));
const lista = (Array.isArray(tarjetas) ? tarjetas : tarjetas.tarjetas)
  .filter((t) => process.argv.includes("--todas") || t.status === "borrador");
const faltan = Object.values(DOCS).filter((d) => !existsSync(path.join(FUENTES, d.archivo))).map((d) => d.archivo);

const md = [
  "# Hoja de verificación de tarjetas — NO SUBIR AL REPO (citas literales)",
  "",
  `Generada: ${new Date().toLocaleString("es-BO", { timeZone: "America/La_Paz" })}. Fuentes locales en \`scratch/verificacion/fuentes/\`${faltan.length ? ` · **faltan: ${faltan.join(", ")}** (esos pasos se cotejan abriendo el PDF de Drive a mano)` : ""}.`,
  "",
  "**Cómo usarla.** Para cada paso: lee los fragmentos propuestos (las palabras en **negrita** coinciden con el paso).",
  "- ✅ **OK** si lo que dice el paso está en esa página (puede estar dicho con otras palabras, pero no agrega nada).",
  "- ❌ **No** si no está, o si el paso dice algo más que la fuente. Anota qué encontraste.",
  "- Los fragmentos son una ayuda: si no convencen, abre el PDF en esa página. **La decisión es tuya, no del script.**",
  "- Además: imperativo, ≤ 18 palabras y sin dosis, medicinas, vacunas ni diagnósticos.",
  "",
  "Al terminar una tarjeta, avísale al agente de tarjetas: *\"`<id>` verificada por `<nombre>`\"* o *\"`<id>` paso N falla: …\"*.",
  "",
];

/** Un bloque a cotejar: el texto de la tarjeta, su fuente y los fragmentos más parecidos de esa página. */
function cotejar(titulo, texto, f, { contarPalabras = false } = {}) {
  const palabras = texto.trim().split(/\s+/).length;
  const aviso = contarPalabras ? ` · ${palabras} palabras${palabras > 18 ? " ⚠ **más de 18**" : ""}` : "";
  md.push(`### ${titulo}${aviso}`, ``, `> ${texto}`, ``);
  if (!f) {
    md.push("Sin fuente: texto fijo del equipo (dice cómo avisar; no es un consejo).", "", "Resultado: ☐ OK  ☐ No — observación: ______________________", "");
    return;
  }
  md.push(`Fuente citada: ${f.doc} — **${f.page}**`, ``);
  for (const ref of referencias(f)) {
    for (const n of ref.paginas) {
      const d = DOCS[ref.clave];
      const donde = d.web ? d.nombre : `${d.nombre}, p. ${n}`;
      const pag = pagina(ref.clave, n);
      if (pag === null) { md.push(`- **${donde}:** fuente no disponible aquí → abrir el original${d.web ? "" : ` en la página ${n}`}.`); continue; }
      const c = candidatos(pag, texto);
      if (!c.length) { md.push(`- **${donde}:** ⚠ no encontré palabras del texto aquí. Revisar a mano (¿página equivocada?).`); continue; }
      for (const x of c) md.push(`- **${donde}** · coincide ${Math.round(x.puntaje * 100)}%${x.puntaje < 0.4 ? " ⚠ débil" : ""}: “${resaltar(x.t.slice(0, 420), x.coinciden)}${x.t.length > 420 ? "…" : ""}”`);
    }
  }
  md.push(``, `Resultado: ☐ OK  ☐ No — observación: ______________________`, ``);
}

for (const t of lista) {
  md.push(`---`, ``, `## ${t.id} — ${t.title}`, ``, `Estado actual: **${t.status}**${t.verified_by ? ` · verificó: ${t.verified_by}` : ""}`, ``);
  if (t.por_que) cotejar("Por qué importa", t.por_que.texto, t.por_que.fuente);
  t.steps.forEach((paso, i) => cotejar(`Paso ${i + 1}`, paso, t.step_sources[i], { contarPalabras: true }));
  (t.evitar ?? []).forEach((e, i) => cotejar(`Evita ${i + 1}`, e.texto, e.fuente));
  if (t.pedir_ayuda) cotejar("Pide ayuda si…", t.pedir_ayuda.texto, t.pedir_ayuda.fuente);
}

// Propuestas v0.4 para las tarjetas YA verificadas (no se cargan hasta cotejarlas: cambian la huella).
const ARCHIVO_PROPUESTAS = path.join(RAIZ, "data", "tarjetas", "propuestas-v04.json");
if (existsSync(ARCHIVO_PROPUESTAS)) {
  const propuestas = JSON.parse(readFileSync(ARCHIVO_PROPUESTAS, "utf8"));
  md.push(`---`, ``, `# Propuestas para las tarjetas ya verificadas`, ``,
    `Solo se cotejan estas secciones nuevas: los pasos ya están verificados. Si quedan OK, se copian a la tarjeta y se vuelve a marcar con \`npm run verificar:tarjeta\`.`, ``);
  for (const [id, p] of Object.entries(propuestas)) {
    if (id.startsWith("_")) continue;
    md.push(`## ${id} (propuesta)`, ``);
    if (p.por_que) cotejar("Por qué importa", p.por_que.texto, p.por_que.fuente);
    (p.evitar ?? []).forEach((e, i) => cotejar(`Evita ${i + 1}`, e.texto, e.fuente));
    if (p.pedir_ayuda) cotejar("Pide ayuda si…", p.pedir_ayuda.texto, p.pedir_ayuda.fuente);
  }
}

mkdirSync(path.dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, md.join("\n"));
console.log(`✔ ${path.relative(RAIZ, SALIDA)} (${lista.length} tarjetas)${faltan.length ? ` · faltan PDFs: ${faltan.join(", ")}` : ""}`);
