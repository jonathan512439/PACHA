// Prueba desechable: verifica que Supabase quedó bien configurado con los contratos v0.2.
// Uso (dentro de /scratch):
//   npm i @supabase/supabase-js
//   node --env-file=.env.local probar-supabase.mjs
// scratch/.env.local (NO se sube al repo) debe tener:
//   SUPABASE_URL=https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<clave secreta: sb_secret_... o service_role>
//   SUPABASE_ANON_KEY=<opcional: clave pública sb_publishable_... o anon, solo para comprobar que RLS bloquea>
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const resultados = [];
const ok = (nombre, cond, detalle = "") => resultados.push(`${cond ? "OK " : "ERR"}  ${nombre}${detalle ? ` — ${detalle}` : ""}`);

// 1. Las 10 tablas existen
const TABLAS = ["stations", "communities", "subscribers", "inbound_messages", "lessons", "bulletins", "alerts", "alert_deliveries", "reports", "deliveries"];
for (const t of TABLAS) {
  const { error } = await db.from(t).select("*", { count: "exact", head: true });
  ok(`tabla ${t}`, !error, error?.message);
}

// 2. Datos de referencia: 2 estaciones
const { data: est, error: eEst } = await db.from("stations").select("id, zona");
ok("estaciones de Oruro cargadas", !eEst && est?.length === 2, eEst?.message ?? JSON.stringify(est));

// 3. Las restricciones de v0.2 funcionan (estos inserts DEBEN fallar con 23514 = check_violation)
const base = { hazard: "helada", phase: "antes_familia", title: "Prueba", steps: ["a", "b", "c"], source_doc: "Prueba", source_page: "1" };
const r1 = await db.from("lessons").insert({ ...base, id: "helada-antes_familia-99", status: "verificada" });
ok("rechaza tarjeta 'verificada' sin verified_by", r1.error?.code === "23514", r1.error?.message);
const r2 = await db.from("lessons").insert({ ...base, id: "T-01" });
ok("rechaza id de tarjeta con formato inválido", r2.error?.code === "23514", r2.error?.message);
const r3 = await db.from("subscribers").insert({ channel: "sms", channel_user_id: "x" });
ok("rechaza canal desconocido", r3.error?.code === "23514", r3.error?.message);
// Limpieza por si alguna restricción NO funcionó y el insert entró
await db.from("lessons").delete().in("id", ["helada-antes_familia-99", "T-01"]);
await db.from("subscribers").delete().eq("channel_user_id", "x");

// 4. Buckets de Storage
const { data: buckets, error: eB } = await db.storage.listBuckets();
const porId = Object.fromEntries((buckets ?? []).map((b) => [b.id, b]));
for (const [id, publico] of [["audios", true], ["tarjetas", true], ["entregas", true], ["boletines", true], ["reportes", false]]) {
  ok(`bucket ${id} (${publico ? "público" : "PRIVADO"})`, !eB && porId[id]?.public === publico, eB?.message ?? (porId[id] ? `public=${porId[id].public}` : "no existe"));
}

// 5. Subir y borrar un archivo de prueba
const ruta = `prueba/${Date.now()}.ogg`;
const up = await db.storage.from("audios").upload(ruta, new Uint8Array([79, 103, 103, 83]), { contentType: "audio/ogg" });
ok("subida a Storage (audios)", !up.error, up.error?.message);
if (!up.error) await db.storage.from("audios").remove([ruta]);

// 6. RLS: con la clave pública NO se debe ver nada
if (SUPABASE_ANON_KEY) {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await anon.from("stations").select("id");
  ok("RLS bloquea la clave pública", !!error || (data ?? []).length === 0, error ? error.message : `filas visibles: ${data?.length}`);
} else {
  resultados.push("---  (sin SUPABASE_ANON_KEY: no se comprobó RLS con la clave pública)");
}

console.log(resultados.join("\n"));
const fallos = resultados.filter((r) => r.startsWith("ERR")).length;
console.log(fallos ? `\n${fallos} comprobación(es) fallaron.` : "\nSupabase listo para v0.2.");
process.exit(fallos ? 1 : 0);
