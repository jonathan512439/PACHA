import { clienteSupabase, falla } from "./_comun";
import { seedDemo } from "@/lib/demo/seed";

async function main() {
  const resultado = await seedDemo(clienteSupabase());
  console.log(`✔ Seed de demo cargado: ${resultado.comunidades} comunidades y ${resultado.entregas} entregas.`);
}

main().catch((error) => falla(error instanceof Error ? error.message : String(error)));
