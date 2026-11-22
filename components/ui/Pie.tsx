import Link from "next/link";

/** Pie público: origen de los datos, voz sintética, imágenes con IA y aviso de datos de demostración. */
export function Pie() {
  return (
    <footer className="mt-12 border-t print:hidden border-borde bg-superficie text-sm text-tinta-2">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p>Avisos: Senamhi, boletín agrometeorológico decenal.</p>
          <p>Audios con voz sintética. Ilustraciones generadas con IA.</p>
          <p>Comunidades, reportes y entregas de demostración.</p>
        </div>
        <div className="space-y-1.5 sm:text-right">
          <p>
            <Link href="/tarjetas" className="text-marca underline">Qué hacer</Link>
            {" · "}
            <Link href="/entregas" className="text-marca underline">Entregas</Link>
            {" · "}
            <Link href="/fuentes" className="text-marca underline">Fuentes</Link>
            {" · "}
            <Link href="/como-funciona" className="text-marca underline">Cómo funciona</Link>
          </p>
          <p>Mapa © colaboradores de OpenStreetMap.</p>
        </div>
      </div>
    </footer>
  );
}
