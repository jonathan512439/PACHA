// Flujo completo EN PRODUCCIÓN por el canal web (el mismo bot que Telegram/WhatsApp), con la "Comunidad de prueba".
// Uso: node probar-produccion.mjs [https://pacha-lilac.vercel.app]   (gasta ~1 llamada a Gemini)
const BASE = process.argv[2] ?? "https://pacha-lilac.vercel.app";
let cookie = "";
const res = [];
const ok = (n, c, d = "") => res.push(`${c ? "OK " : "ERR"}  ${n}${d ? ` — ${d}` : ""}`);
async function bot(cuerpo) {
  const r = await fetch(`${BASE}/api/bot/web`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(cuerpo) });
  const s = r.headers.get("set-cookie"); if (s) cookie = s.split(";")[0];
  return (await r.json()).respuestas ?? [];
}
const boton = (rs, f) => rs.flatMap((x) => x.botones ?? x.filas ?? []).find(f);
const prioridadPrueba = async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  const i = html.indexOf("Comunidad de prueba");
  return i < 0 ? "no aparece" : html.slice(i, i + 400).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 120);
};

ok("0. mapa antes", true, await prioridadPrueba());
let r = await bot({ tipo: "texto", texto: "hola" });
ok("1. bienvenida con botones", !!boton(r, (b) => b.id === "optin:si"));
r = await bot({ tipo: "boton", botonId: "optin:si" });
const prueba = boton(r, (b) => /prueba/i.test(b.titulo));
ok("2. lista de comunidades (con la de prueba)", !!prueba, `${r.flatMap((x) => x.filas ?? []).length} comunidades`);
r = await bot({ tipo: "boton", botonId: prueba.id });
ok("3. registrado", r.some((x) => x.texto?.includes("registrado")));
r = await bot({ tipo: "texto", texto: "Hace seis días que la vertiente está seca, somos como cuarenta familias." });
const si = boton(r, (b) => b.id.startsWith("rep_si:"));
ok("4. reporte -> ¿Entendí bien?", !!si, r.find((x) => x.tipo === "botones")?.texto);
r = await bot({ tipo: "boton", botonId: si.id });
ok("5. confirmado", r.some((x) => x.texto?.includes("mapa público")), r.map((x) => x.tipo).join(","));
ok("6. mapa después (la comunidad de prueba cambia)", true, await prioridadPrueba());
r = await bot({ tipo: "texto", texto: "BAJA" });
ok("7. BAJA", r.some((x) => x.texto?.includes("ya no recibirás")));
console.log(res.join(String.fromCharCode(10)));
