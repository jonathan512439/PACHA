import { connection } from "next/server";
import { Suspense } from "react";
import { leerDatosPublicos } from "@/lib/datos-publicos";
import { MapaInicio } from "./mapa/MapaInicio";

export default function Home() {
  return (
    <Suspense fallback={<main>Cargando mapa público…</main>}>
      <ContenidoMapa />
    </Suspense>
  );
}

async function ContenidoMapa() {
  await connection();
  const datos = await leerDatosPublicos();
  return <MapaInicio inicial={datos} />;
}
