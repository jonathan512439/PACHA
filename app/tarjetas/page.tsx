import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { etiquetaEstadoTarjeta } from "@/contratos/tipos";
import { listarTarjetas } from "@/lib/tarjetas";
import { MENSAJE_EN_VERIFICACION, permitirBorrador, puedePublicarse } from "@/lib/tarjeta-publica";
import "./tarjetas.css";

export default function PaginaTarjetas() {
  return (
    <main className="tjs-pagina">
      <h1 className="tjs-tituloPagina">Tarjetas “qué hacer”</h1>
      <p className="tjs-intro">Recomendaciones de fuentes oficiales, cada paso con su página.</p>
      <Suspense fallback={<p className="tjs-cargando">Cargando tarjetas…</p>}>
        <Lista />
      </Suspense>
    </main>
  );
}

async function Lista() {
  await connection();
  const permitir = permitirBorrador();
  const tarjetas = await listarTarjetas();
  if (tarjetas.length === 0) return <p className="tjs-aviso">Todavía no hay tarjetas cargadas.</p>;
  return (
    <ul className="tjs-lista">
      {tarjetas.map((t) =>
        puedePublicarse(t, permitir) ? (
          <li key={t.id}>
            <Link href={`/tarjetas/${t.id}`}>{t.title}</Link>
            <span className={t.status === "borrador" ? "tjs-etiquetaBorrador" : "tjs-etiqueta"}>{etiquetaEstadoTarjeta(t)}</span>
          </li>
        ) : (
          <li key={t.id} className="tjs-noDisponible">
            {t.title} <span className="tjs-etiqueta">{MENSAJE_EN_VERIFICACION}</span>
          </li>
        ),
      )}
    </ul>
  );
}
