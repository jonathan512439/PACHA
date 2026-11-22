import Link from "next/link";

/** Pie público: qué es de EJEMPLO, de dónde salen los datos, voz sintética e imágenes con IA. */
export function Pie() {
  return (
    <footer className="mt-12 border-t border-borde bg-superficie text-sm text-tinta-2">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p>
            <strong className="text-tinta">Comunidades, reportes y entregas de EJEMPLO.</strong> Los avisos son del Senamhi
            (boletín agrometeorológico decenal) y cada tarjeta cita su fuente y página.
          </p>
          <p>Los audios usan voz sintética. Las ilustraciones son generadas con IA.</p>
        </div>
        <div className="space-y-1.5 sm:text-right">
          <p>
            <Link href="/tarjetas" className="text-marca underline">Tarjetas</Link>
            {" · "}
            <Link href="/entregas" className="text-marca underline">Entregas</Link>
            {" · "}
            <Link href="/#como-se-calcula" className="text-marca underline">¿Cómo se calcula la prioridad?</Link>
          </p>
          <p>Piloto para un municipio del Altiplano de Oruro · Hackathon 2026</p>
          <p>Mapa © colaboradores de OpenStreetMap.</p>
        </div>
      </div>
    </footer>
  );
}
