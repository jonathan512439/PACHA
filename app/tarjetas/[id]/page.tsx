import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TarjetaVisual } from "@/components/tarjeta/TarjetaVisual";
import { MENSAJE_EN_VERIFICACION } from "@/lib/tarjeta-publica";
import { cargarTarjetaVisible } from "../cargar";
import s from "../tarjetas.module.css";

type Props = { params: Promise<{ id: string }> };

export default function PaginaTarjeta({ params }: Props) {
  return (
    <main className={s.pagina}>
      <nav className={s.nav}>
        <Link href="/tarjetas">← Todas las tarjetas</Link>
      </nav>
      <Suspense fallback={<p className={s.cargando}>Cargando tarjeta…</p>}>
        {params.then(({ id }) => <Contenido id={id} />)}
      </Suspense>
    </main>
  );
}

async function Contenido({ id }: { id: string }) {
  const r = await cargarTarjetaVisible(id);
  if (r.estado === "no_existe") notFound();
  if (r.estado === "en_verificacion") return <p className={s.aviso}>{MENSAJE_EN_VERIFICACION}</p>;
  return (
    <>
      <TarjetaVisual tarjeta={r.tarjeta} imagenes={r.imagenes} variante="web" />
      <p className={s.acciones}>
        <a href={`/tarjetas/${id}/imagen`}>Ver como imagen (1080×1350)</a> · Para imprimir en A4, usa Imprimir del navegador.
      </p>
    </>
  );
}
