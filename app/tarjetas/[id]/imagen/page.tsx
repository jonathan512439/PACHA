import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TarjetaVisual } from "@/components/tarjeta/TarjetaVisual";
import { MENSAJE_EN_VERIFICACION } from "@/lib/tarjeta-publica";
import { cargarTarjetaVisible } from "../../cargar";

// Variante de tamaño fijo 1080×1350 para exportar el PNG con Playwright (scripts/exportar-tarjetas.ts).
// Misma componente que /tarjetas/[id]: una sola fuente de verdad.
type Props = { params: Promise<{ id: string }> };

export default function ImagenTarjeta({ params }: Props) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => <Contenido id={id} />)}
    </Suspense>
  );
}

async function Contenido({ id }: { id: string }) {
  const r = await cargarTarjetaVisible(id);
  if (r.estado === "no_existe") notFound();
  if (r.estado === "en_verificacion") return <p data-en-verificacion>{MENSAJE_EN_VERIFICACION}</p>;
  return (
    <div id="tarjeta-exportable" style={{ width: 1080, height: 1350 }}>
      <TarjetaVisual tarjeta={r.tarjeta} imagenes={r.imagenes} variante="imagen" />
    </div>
  );
}
