// Datos de ejemplo del demo: comunidades, reportes y entregas EJEMPLO. Uso: npm run seed:demo
// Borra reportes, alertas, boletines y entregas (NO suscriptores ni tarjetas) y vuelve a cargar el ejemplo.
// Fotos opcionales de C: assets/entregas-ejemplo/1.jpg, 2.jpg, 3.jpg (objetos, sin personas, SIN EXIF).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { reiniciarDemo, type FotosEjemplo } from "@/lib/demo-datos";
import { RAIZ, clienteSupabase, falla } from "./_comun";

const fotos: FotosEjemplo = {};
for (const n of [1, 2, 3] as const) {
  const p = path.join(RAIZ, "assets", "entregas-ejemplo", `${n}.jpg`);
  if (existsSync(p)) fotos[n] = new Uint8Array(readFileSync(p));
}

// Sin await de nivel superior: tsx compila estos scripts como CommonJS.
reiniciarDemo(clienteSupabase(), fotos)
  .then((r) => console.log(`✔ Demo reiniciado: ${r.comunidades} comunidades, ${r.reportes} reportes, ${r.entregas} entregas, ${r.fotos} fotos.`))
  .catch((e) => falla(String(e)));
