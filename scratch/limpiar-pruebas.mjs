// Borra SOLO los datos de prueba que crean los scripts de /scratch (marca PRUEBA). Uso: node --env-file=../.env limpiar-pruebas.mjs
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const t = await db.from("lessons").delete().eq("verified_by", "PRUEBA-AUTOMATICA").eq("source_doc", "PRUEBA").select("id");
console.log("tarjetas de prueba borradas:", (t.data ?? []).map((x) => x.id).join(", ") || "ninguna", t.error?.message ?? "");
const { data: coms } = await db.from("communities").select("id, name").like("name", "PRUEBA %").eq("is_example", true);
for (const c of coms ?? []) {
  const [{ count: s }, { count: r }] = await Promise.all([
    db.from("subscribers").select("*", { count: "exact", head: true }).eq("community_id", c.id),
    db.from("reports").select("*", { count: "exact", head: true }).eq("community_id", c.id),
  ]);
  if (s || r) { console.log(`se conserva ${c.name}: tiene ${s} suscriptores y ${r} reportes`); continue; }
  const { error } = await db.from("communities").delete().eq("id", c.id);
  console.log(`comunidad borrada: ${c.name}`, error?.message ?? "");
}
const [{ count: tl }, { count: cp }] = await Promise.all([
  db.from("lessons").select("*", { count: "exact", head: true }),
  db.from("communities").select("*", { count: "exact", head: true }).like("name", "PRUEBA %"),
]);
console.log(`quedan: ${tl} tarjetas en total, ${cp} comunidades de prueba`);
