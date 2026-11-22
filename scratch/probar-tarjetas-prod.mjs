// En PRODUCCIÓN por el canal web: el menú y un reporte devuelven tarjetas verificadas con audio e imagen válidos.
// Uso: node probar-tarjetas-prod.mjs   (gasta 1 llamada a Gemini; deja un reporte en "Comunidad de prueba")
const BASE = "https://pacha-lilac.vercel.app";
let cookie = "";
const res = [], ok = (n, c, d = "") => res.push(`${c ? "OK " : "ERR"}  ${n}${d ? ` — ${d}` : ""}`);
async function bot(cuerpo) {
  const r = await fetch(`${BASE}/api/bot/web`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(cuerpo) });
  const s = r.headers.get("set-cookie"); if (s) cookie = s.split(";")[0];
  return (await r.json()).respuestas ?? [];
}
const boton = (rs, f) => rs.flatMap((x) => x.botones ?? x.filas ?? []).find(f);
const vivo = async (url) => url ? (await fetch(url, { method: "HEAD" })).status : "sin URL";
await bot({ tipo: "texto", texto: "hola" });
let r = await bot({ tipo: "boton", botonId: "optin:si" });
await bot({ tipo: "boton", botonId: boton(r, (b) => /prueba/i.test(b.titulo)).id });
for (const [op, mom] of [["agua", "ahora"], ["animales", "antes"], ["cultivos", "ahora"]]) {
  r = await bot({ tipo: "boton", botonId: `menu:${op}:${mom}` });
  const ts = r.filter((x) => x.tipo === "tarjeta");
  for (const t of ts) ok(`menú ${op}/${mom} → ${t.id}`, t.etiquetaEstado === "Verificada contra fuente" && t.pasos.length === 3,
    `etiqueta "${t.etiquetaEstado}" · audio ogg ${await vivo(t.audioOggUrl)} · mp3 ${await vivo(t.audioMp3Url)} · imagen ${await vivo(t.imagenUrl)}`);
  if (!ts.length) ok(`menú ${op}/${mom}`, false, r.map((x) => x.texto ?? x.tipo).join(" | "));
}
r = await bot({ tipo: "texto", texto: "Hace seis días que la vertiente está seca, somos como cuarenta familias." });
const si = boton(r, (b) => b.id.startsWith("rep_si:"));
r = si ? await bot({ tipo: "boton", botonId: si.id }) : [];
const tf = r.find((x) => x.tipo === "tarjeta");
ok("reporte confirmado → tarjeta por factor", !!tf, tf ? `${tf.id} · audio ${await vivo(tf.audioOggUrl)}` : r.map((x) => x.texto ?? x.tipo).join(" | "));
r = await bot({ tipo: "texto", texto: "¿Cómo protejo mi papa de la helada?" });
const tp = r.find((x) => x.tipo === "tarjeta");
ok("pregunta libre → tarjeta", !!tp, tp?.id ?? r.map((x) => x.texto ?? x.tipo).join(" | "));
await bot({ tipo: "texto", texto: "BAJA" });
console.log(res.join(String.fromCharCode(10)));
