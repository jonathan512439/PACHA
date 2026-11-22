import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TarjetaVisual } from "@/components/tarjeta/TarjetaVisual";
import { SeccionesV04 } from "@/components/tarjeta/SeccionesV04";
import { Vacio } from "@/components/ui/Vacio";
import { audioVigente, BUCKET_AUDIOS, baseStorage, MENSAJE_EN_VERIFICACION, urlPublica } from "@/lib/tarjeta-publica";
import { cargarTarjetaVisible } from "../cargar";

export default function PaginaTarjeta({ params }: PageProps<"/tarjetas/[id]">) {
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:py-8">
      <nav className="print:hidden">
        <Link href="/tarjetas" className="inline-flex min-h-10 items-center text-marca underline hover:no-underline">← Todas las tarjetas</Link>
      </nav>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando la tarjeta" />}>
        {params.then(({ id }) => <Contenido id={id} />)}
      </Suspense>
    </main>
  );
}

async function Contenido({ id }: { id: string }) {
  const r = await cargarTarjetaVisible(id);
  if (r.estado === "no_existe") notFound();
  if (r.estado === "en_verificacion") return <Vacio titulo={MENSAJE_EN_VERIFICACION}>Se publica cuando una persona del equipo compare cada paso con su fuente.</Vacio>;
  const t = r.tarjeta;
  const audioUrl = audioVigente(t, "mp3") ? urlPublica(baseStorage(process.env.SUPABASE_URL), BUCKET_AUDIOS, t.audio_mp3_path) : null;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="space-y-2">
        <TarjetaVisual tarjeta={t} imagenes={r.imagenes} variante="web" />
        <p className="text-sm text-tinta-2 print:hidden">
          <a href={`/tarjetas/${id}/imagen`} className="text-marca underline">Ver como imagen (1080×1350)</a> · Para imprimir en A4, usa Imprimir del navegador.
        </p>
      </div>
      <div className="print:hidden">
        <SeccionesV04 tarjeta={t} audioUrl={audioUrl} />
      </div>
    </div>
  );
}
