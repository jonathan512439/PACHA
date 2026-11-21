// Prueba de punta a punta de la API del boletín, las alertas y las entregas contra `next dev`.
// El servidor debe arrancar con: PANEL_USERS=prueba:clave-prueba CRON_SECRET=cron-prueba
// Uso (dentro de /scratch): node --env-file=../.env probar-boletin-api.mjs [base]
// Usa el boletín REAL del Senamhi (1 llamada a Gemini). Crea datos de prueba y los BORRA al final
// (incluido el boletín, para que el demo pueda detectarlo en vivo).
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3100";
const AUTH = "Basic " + Buffer.from("prueba:clave-prueba").toString("base64");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MARCA = "PRUEBA-AUTOMATICA";
const res = [];
const ok = (n, c, d = "") => res.push(`${c ? "OK " : "ERR"}  ${n}${d ? ` — ${d}` : ""}`);
const api = async (ruta, { method = "POST", auth = AUTH, body, headers = {} } = {}) => {
  const r = await fetch(`${BASE}${ruta}`, { method, body, headers: { ...(auth ? { authorization: auth } : {}), ...headers } });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j, wwwAuth: r.headers.get("www-authenticate") };
};

let boletinId = null, alertaId = null, comId = null, subId = null, entregaId = null, leccionCreada = false;
try {
  // ---- autenticación ----
  ok("1. cron sin secreto -> 401", (await api("/api/boletin/buscar", { method: "GET", auth: null })).status === 401);
  ok("   cron con secreto equivocado -> 401", (await api("/api/boletin/buscar", { method: "GET", auth: "Bearer otro" })).status === 401);
  const sinAuth = await api("/api/boletin/buscar", { auth: null });
  ok("2. panel sin usuario -> 401 con pedido de login", sinAuth.status === 401 && /Basic/.test(sinAuth.wwwAuth ?? ""));

  // ---- buscar boletín real ----
  let r = await api("/api/boletin/buscar");
  boletinId = r.j?.boletinId ?? null; alertaId = r.j?.alertaId ?? null;
  ok("3. buscar -> alerta creada en borrador", r.j?.estado === "alerta_creada", `${r.j?.estado} · riesgo ${r.j?.decision?.riesgo} · origen ${r.j?.origen} · tarjeta lista: ${r.j?.tarjetaLista}`);
  if (alertaId) {
    const { data: a } = await db.from("alerts").select("status, risk_level, cita_evento, valid_from, valid_to, message_text, decision_reason").eq("id", alertaId).single();
    ok("   alerta: borrador, riesgo medio, cita literal y período", a?.status === "borrador" && a?.risk_level === "medio" && /punto de congelaci/i.test(a?.cita_evento ?? "") && a?.valid_from === "2026-11-14",
      `${a?.valid_from} a ${a?.valid_to}`);
    ok("   sin tarjeta publicable: mensaje sin 'Qué hacer' y motivo lo advierte", !a?.message_text.includes("Qué hacer") && /no se puede aprobar/.test(a?.decision_reason ?? ""));
  }
  r = await api("/api/boletin/buscar");
  ok("4. buscar otra vez -> sin novedad (no duplica)", r.j?.estado === "sin_novedad", r.j?.estado);

  // ---- aprobar ----
  r = await api(`/api/alertas/${alertaId}/aprobar`);
  ok("5. aprobar sin tarjeta verificada -> 409", r.status === 409, r.j?.error);
  const f = { doc: "PRUEBA", page: "p. 1" };
  const ins = await db.from("lessons").insert({ id: "helada-antes_familia-01", hazard: "helada", phase: "antes_familia", title: "Protege cultivos (prueba)",
    steps: ["Paso uno de prueba.", "Paso dos de prueba.", "Paso tres de prueba."], step_sources: [f, f, f], source_doc: "PRUEBA", source_page: "1",
    author: "PRUEBA", status: "verificada", verified_by: MARCA });
  leccionCreada = !ins.error;
  r = await api(`/api/alertas/${alertaId}/aprobar`);
  ok("6. con tarjeta verificada -> aprobada, firmada y con 'Qué hacer'", r.status === 200 && r.j?.approved_by === "prueba" && r.j?.message_text?.includes("Qué hacer: 1) Paso uno"), r.j?.error ?? "");
  ok("   aprobar dos veces -> 409", (await api(`/api/alertas/${alertaId}/aprobar`)).status === 409);

  // ---- enviar (a un chat de Telegram ficticio: debe quedar como fallido, no romper) ----
  const c = await db.from("communities").insert({ name: "PRUEBA Kantuta Pampa", municipio: "Toledo", lat: -18.18, lon: -67.41, families: 45, animals: 900,
    main_activity: "camelidos", station_id: "oruro-ciudad", is_example: true }).select("id").single();
  comId = c.data.id;
  const s = await db.from("subscribers").insert({ community_id: comId, channel: "telegram", channel_user_id: "999000222", estado: "listo", activo: true }).select("id").single();
  subId = s.data.id;
  r = await api(`/api/alertas/${alertaId}/enviar`);
  ok("7. enviar -> alerta enviada; chat inexistente queda como fallido", r.status === 200 && r.j?.status === "enviada" && r.j?.fallidos === 1 && r.j?.enviados === 0, JSON.stringify({ enviados: r.j?.enviados, fallidos: r.j?.fallidos, error: r.j?.errores?.[0]?.slice(0, 70) }));
  const { data: ad } = await db.from("alert_deliveries").select("status").eq("alert_id", alertaId);
  ok("   registro en alert_deliveries", ad?.length === 1 && ad[0].status === "fallido");
  r = await api(`/api/alertas/${alertaId}/enviar`);
  ok("8. reenviar -> reintenta solo a los fallidos (sin duplicar filas)", r.status === 200 && r.j?.fallidos === 1);
  ok("9. descartar una alerta enviada -> 409", (await api(`/api/alertas/${alertaId}/descartar`)).status === 409);

  // ---- entregas ----
  const fd = () => { const x = new FormData(); x.set("communityId", comId); x.set("kind", "cisterna"); x.set("quantity", "1"); return x; };
  ok("10. entrega sin usuario -> 401", (await api("/api/entregas", { auth: null, body: fd() })).status === 401);
  const malo = fd(); malo.set("quantity", "0");
  ok("    cantidad 0 -> 400", (await api("/api/entregas", { body: malo })).status === 400);
  r = await api("/api/entregas", { body: fd() });
  entregaId = r.j?.id ?? null;
  const { data: d } = entregaId ? await db.from("deliveries").select("kind, unit, registered_by, confirmed_by_community").eq("id", entregaId).single() : { data: null };
  ok("11. entrega registrada (cisternas, firmada, sin confirmar aún)", r.status === 200 && d?.unit === "cisternas" && d?.registered_by === "prueba" && d?.confirmed_by_community === null,
    `notificados: ${r.j?.notificados} (chat ficticio: 0 esperado)`);
} finally {
  // ---- limpieza ----
  if (alertaId) { await db.from("alert_deliveries").delete().eq("alert_id", alertaId); await db.from("alerts").delete().eq("id", alertaId); }
  if (boletinId) {
    const { data: b } = await db.from("bulletins").select("pdf_path").eq("id", boletinId).maybeSingle();
    await db.from("alerts").delete().eq("bulletin_id", boletinId);
    await db.from("bulletins").delete().eq("id", boletinId);
    if (b?.pdf_path) await db.storage.from("boletines").remove([b.pdf_path]);
  }
  if (entregaId) await db.from("deliveries").delete().eq("id", entregaId);
  if (subId) await db.from("subscribers").delete().eq("id", subId);
  if (comId) { await db.from("deliveries").delete().eq("community_id", comId); await db.from("communities").delete().eq("id", comId); }
  if (leccionCreada) await db.from("lessons").delete().eq("id", "helada-antes_familia-01").eq("verified_by", MARCA);
  const [{ count: nb }, { count: nc }, { count: nl }] = await Promise.all([
    db.from("bulletins").select("*", { count: "exact", head: true }),
    db.from("communities").select("*", { count: "exact", head: true }).like("name", "PRUEBA %"),
    db.from("lessons").select("*", { count: "exact", head: true }).eq("verified_by", MARCA),
  ]);
  res.push(nb === 0 && nc === 0 && nl === 0 ? "OK   limpieza: sin boletines, comunidades ni tarjetas de prueba" : `ERR  limpieza: boletines ${nb}, comunidades ${nc}, tarjetas ${nl}`);
  console.log(res.join(String.fromCharCode(10)));
}
