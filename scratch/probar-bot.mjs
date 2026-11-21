// Prueba de punta a punta del bot por el canal web (/api/bot/web), como lo usará /probar.
// Requiere `next dev` corriendo. Uso (dentro de /scratch):
//   node --env-file=../.env probar-bot.mjs [http://localhost:3100]
// Carga datos TEMPORALES marcados "PRUEBA" (2 comunidades y 2 tarjetas) y los BORRA al final, aunque falle.
// Gasta ~4 llamadas a Gemini.
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3100";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MARCA = "PRUEBA-AUTOMATICA";
const resultados = [];
const ok = (n, c, d = "") => { resultados.push(`${c ? "OK " : "ERR"}  ${n}${d ? ` — ${d}` : ""}`); return c; };

// ---- limpieza por MARCA (también borra restos de una ejecución anterior que no pudo limpiar) ----
async function limpiarRestos() {
  const { data: viejas } = await db.from("communities").select("id").like("name", "PRUEBA %").eq("is_example", true);
  const ids = (viejas ?? []).map((c) => c.id);
  if (ids.length) {
    const { data: subs } = await db.from("subscribers").select("id").in("community_id", ids);
    const subIds = (subs ?? []).map((x) => x.id);
    if (subIds.length) {
      const { data: medias } = await db.from("reports").select("media_path").in("subscriber_id", subIds).not("media_path", "is", null);
      if (medias?.length) await db.storage.from("reportes").remove(medias.map((m) => m.media_path));
      await db.from("reports").delete().in("subscriber_id", subIds);
      await db.from("subscribers").delete().in("id", subIds);
    }
    await db.from("reports").delete().in("community_id", ids);
    await db.from("communities").delete().in("id", ids);
  }
  await db.from("lessons").delete().eq("verified_by", MARCA).eq("source_doc", "PRUEBA");
}
await limpiarRestos();

// ---- datos temporales -------------------------------------------------
const base = { municipio: "Toledo", lat: -18.18, lon: -67.41, main_activity: "camelidos", station_id: "oruro-ciudad", is_example: true };
const { data: coms, error: eC } = await db.from("communities").insert([
  { ...base, name: "PRUEBA Kantuta Pampa", families: 45, animals: 900 },
  { ...base, name: "PRUEBA Villa Ejemplo", families: 20, animals: 300, lat: -18.2 },
]).select("id, name");
if (eC) throw eC;
const [kantuta, villa] = coms;

const TARJETAS = [
  { id: "sequia-durante-01", hazard: "sequia", phase: "durante", title: "Cuida el agua escasa y prioriza el hato",
    steps: ["(prueba) paso 1", "(prueba) paso 2", "(prueba) paso 3"], factor_tags: ["sin_agua_consumo", "pozo_o_vertiente_seca", "sin_reserva_forraje"] },
  { id: "helada-antes_familia-01", hazard: "helada", phase: "antes_familia", title: "Protege cultivos y reservas familiares antes de la helada",
    steps: ["(prueba) paso 1", "(prueba) paso 2", "(prueba) paso 3"], factor_tags: ["cultivos_sin_proteccion_helada"] },
];
const insertadas = [];
for (const t of TARJETAS) {
  // Formato v0.3: una fuente por paso; author = autor de la guía; verificada exige verified_by.
  const fuente = { doc: "PRUEBA", page: "p. 1" };
  const { error } = await db.from("lessons").insert({
    ...t, step_sources: [fuente, fuente, fuente], source_doc: "PRUEBA", source_page: "1",
    author: "PRUEBA-AUTOR", status: "verificada", verified_by: MARCA,
  });
  if (error && error.code !== "23505") console.log(`(aviso) no se pudo cargar ${t.id}: ${error.message}`);
  if (!error) insertadas.push(t.id); // si ya existía una tarjeta real (cargada por C), no se toca
}

// ---- conversación ------------------------------------------------------
let cookie = "";
async function enviar(cuerpo) {
  const r = await fetch(`${BASE}/api/bot/web`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(cuerpo) });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const j = await r.json();
  return { status: r.status, respuestas: j.respuestas ?? [] };
}
const boton = (rs, pref) => rs.flatMap((x) => x.botones ?? x.filas ?? []).find((b) => b.id.startsWith(pref));
const tiene = (rs, tipo, f = () => true) => rs.some((x) => x.tipo === tipo && f(x));
let subId = null;

try {
  let r = await enviar({ tipo: "texto", texto: "hola" });
  ok("1. saludo -> pregunta de suscripción", !!boton(r.respuestas, "optin:si"), `cookie ${cookie ? "creada" : "NO"}`);

  r = await enviar({ tipo: "boton", botonId: "optin:si" });
  ok("2. Sí -> lista de comunidades", !!boton(r.respuestas, `com:${kantuta.id}`));

  r = await enviar({ tipo: "boton", botonId: `com:${kantuta.id}` });
  ok("3. elige comunidad -> registrado", tiene(r.respuestas, "texto", (x) => x.texto.includes("PRUEBA Kantuta Pampa")));

  r = await enviar({ tipo: "texto", texto: "0" });
  ok("4. '0' -> menú de temas", !!boton(r.respuestas, "menu:agua"));

  r = await enviar({ tipo: "boton", botonId: "menu:agua:ahora" });
  ok("5. Agua + ahora -> tarjeta sequia-durante-01", tiene(r.respuestas, "tarjeta", (x) => x.id === "sequia-durante-01" && x.etiquetaEstado === "Verificada contra fuente"));

  r = await enviar({ tipo: "texto", texto: "Hace seis días que la vertiente está seca, somos como cuarenta familias." });
  const si = boton(r.respuestas, "rep_si:");
  ok("6. reporte -> '¿Entendí bien?'", !!si, r.respuestas.find((x) => x.tipo === "botones")?.texto);

  if (si) {
    r = await enviar({ tipo: "boton", botonId: si.id });
    ok("7. Sí -> confirmado + tarjeta por factor", tiene(r.respuestas, "texto", (x) => x.texto.includes("mapa público")) && tiene(r.respuestas, "tarjeta"));
    const { data: rep } = await db.from("reports").select("status, priority_score, priority_breakdown, community_id").eq("id", si.id.split(":")[1]).single();
    subId = (await db.from("reports").select("subscriber_id").eq("id", si.id.split(":")[1]).single()).data?.subscriber_id;
    ok("   en la base: confirmado con prioridad", rep?.status === "confirmado" && rep?.priority_score > 0, `score ${rep?.priority_score} (${rep?.priority_breakdown?.urgencia})`);
  }

  r = await enviar({ tipo: "texto", texto: "¿Qué vacuna le pongo a mis alpacas?" });
  ok("8. vacuna -> mensaje fijo, sin tarjeta", tiene(r.respuestas, "texto", (x) => x.texto.includes("No damos medicinas")) && !tiene(r.respuestas, "tarjeta"));

  r = await enviar({ tipo: "texto", texto: "¿Cómo protejo mi papa de la helada?" });
  ok("9. papa y helada -> tarjeta helada-antes_familia-01", tiene(r.respuestas, "tarjeta", (x) => x.id === "helada-antes_familia-01"),
    r.respuestas.map((x) => x.tipo === "tarjeta" ? x.id : x.tipo).join(","));

  r = await enviar({ tipo: "texto", texto: "En PRUEBA Villa Ejemplo hace tres días no tienen forraje, son veinte familias." });
  const mia = boton(r.respuestas, "rep_com:mia");
  ok("10. nombra otra comunidad -> pregunta cuál", !!mia && !!boton(r.respuestas, `rep_com:${villa.id}`),
    r.respuestas.map((x) => x.texto).join(" | ").slice(0, 120));
  if (mia) {
    r = await enviar({ tipo: "boton", botonId: `rep_com:${villa.id}` });
    ok("11. elige la otra -> confirmación con su nombre", tiene(r.respuestas, "botones", (x) => x.texto.includes("PRUEBA Villa Ejemplo")));
  }

  r = await enviar({ tipo: "texto", texto: "BAJA" });
  ok("12. BAJA -> baja", tiene(r.respuestas, "texto", (x) => x.texto.includes("ya no recibirás")));
  if (subId) {
    const { data: sub } = await db.from("subscribers").select("estado, activo, community_id").eq("id", subId).single();
    ok("   en la base: suscriptor dado de baja", sub?.estado === "baja" && sub?.activo === false);
  }
} finally {
  // ---- limpieza -----------------------------------------------------------
  if (subId) {
    const { data: medias } = await db.from("reports").select("media_path").eq("subscriber_id", subId).not("media_path", "is", null);
    if (medias?.length) await db.storage.from("reportes").remove(medias.map((m) => m.media_path));
    await db.from("reports").delete().eq("subscriber_id", subId);
    await db.from("subscribers").delete().eq("id", subId);
  }
  await limpiarRestos();
  const { count } = await db.from("communities").select("*", { count: "exact", head: true }).like("name", "PRUEBA %");
  const { count: tPrueba } = await db.from("lessons").select("*", { count: "exact", head: true }).eq("verified_by", MARCA);
  resultados.push(count === 0 && tPrueba === 0 ? "OK   limpieza: no quedan datos de prueba" : `ERR  limpieza: quedan ${count} comunidades y ${tPrueba} tarjetas de prueba`);
  console.log(resultados.join(String.fromCharCode(10)));
}
