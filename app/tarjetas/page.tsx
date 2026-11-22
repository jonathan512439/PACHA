import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Snowflake, Sun, CloudSnow, ImageOff } from "lucide-react";
import { etiquetaEstadoTarjeta, type Tarjeta } from "@/contratos/tipos";
import { listarTarjetas, rutaEncabezadoRespaldo } from "@/lib/tarjetas";
import { baseStorage, MENSAJE_EN_VERIFICACION, permitirBorrador, puedePublicarse, resolverImagenes } from "@/lib/tarjeta-publica";
import { Insignia } from "@/components/ui/Insignia";
import { Vacio } from "@/components/ui/Vacio";

export const metadata: Metadata = {
  title: "Qué hacer: tarjetas",
  description: "Tarjetas cortas de qué hacer ante la helada, la sequía y la nevada, cada paso con su fuente oficial y página.",
};

const AMENAZAS = [
  { id: "helada", texto: "Helada", Icono: Snowflake },
  { id: "sequia", texto: "Sequía", Icono: Sun },
  { id: "nevada", texto: "Nevada", Icono: CloudSnow },
] as const;
const FASES = [
  { id: "antes", texto: "Antes", fases: ["antes_familia", "antes_animales"] },
  { id: "durante", texto: "Durante", fases: ["durante"] },
  { id: "despues", texto: "Después", fases: ["despues"] },
] as const;
const PUBLICO: Record<Tarjeta["phase"], string> = { antes_familia: "Familia y cultivos", antes_animales: "Animales", durante: "", despues: "" };

export default function PaginaTarjetas() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
      <header className="max-w-prose space-y-2">
        <h1 className="text-4xl font-semibold">Qué hacer</h1>
        <p className="text-lg text-tinta-2">
          Tarjetas cortas para antes, durante y después de cada amenaza. Cada paso sale de una guía oficial y cita su página.
        </p>
        <p className="text-sm">
          <Link href="/fuentes" className="font-semibold text-marca underline">Ver todas las fuentes oficiales</Link>
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-superficie-2" aria-label="Cargando las tarjetas" />}>
        <Cuadricula />
      </Suspense>
    </main>
  );
}

async function Cuadricula() {
  await connection();
  const permitir = permitirBorrador();
  const [tarjetas, respaldo] = await Promise.all([listarTarjetas(), rutaEncabezadoRespaldo()]);
  if (tarjetas.length === 0) return <Vacio titulo="Todavía no hay tarjetas cargadas." />;
  const base = baseStorage(process.env.SUPABASE_URL);
  const presentes = AMENAZAS.filter((a) => tarjetas.some((t) => t.hazard === a.id));

  return (
    <div className="space-y-8">
      <nav aria-label="Ir a una amenaza" className="flex flex-wrap gap-2">
        {presentes.map(({ id, texto, Icono }) => (
          <a key={id} href={`#${id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-borde-fuerte bg-superficie px-4 font-medium text-tinta no-underline hover:bg-marca-suave">
            <Icono aria-hidden="true" className="size-4 text-marca" />
            {texto}
          </a>
        ))}
      </nav>

      {presentes.map(({ id, texto, Icono }) => (
        <section key={id} id={id} aria-labelledby={`t-${id}`} className="scroll-mt-4 space-y-4">
          <h2 id={`t-${id}`} className="flex items-center gap-2 text-2xl font-semibold">
            <Icono aria-hidden="true" className="size-6 text-marca" />
            {texto}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FASES.map((f) => {
              const delGrupo = tarjetas.filter((t) => t.hazard === id && (f.fases as readonly string[]).includes(t.phase));
              return (
                <div key={f.id} className="space-y-3">
                  <h3 className="border-b border-borde-fuerte pb-1 font-sans text-sm font-bold uppercase tracking-wider text-tinta-2">{f.texto}</h3>
                  {delGrupo.length === 0 ? (
                    <p className="text-sm text-tinta-2">Sin tarjeta todavía.</p>
                  ) : (
                    <ul className="space-y-3">
                      {delGrupo.map((t) => {
                        const visible = puedePublicarse(t, permitir);
                        const img = resolverImagenes(t, base, respaldo).encabezado;
                        const contenido = (
                          <>
                            <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-superficie-2">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element -- imagen de Storage (dominio dinámico)
                                <img src={img} alt="" loading="lazy" className={visible ? "size-full object-cover" : "size-full object-cover opacity-50 grayscale"} />
                              ) : (
                                <div className="flex size-full items-center justify-center text-tinta-2"><ImageOff aria-hidden="true" className="size-8" /></div>
                              )}
                            </div>
                            <div className="space-y-2 p-4">
                              {PUBLICO[t.phase] && <p className="text-xs font-bold uppercase tracking-wider text-acento">{PUBLICO[t.phase]}</p>}
                              <p className="font-titulo text-lg font-semibold leading-snug text-tinta">{t.title}</p>
                              <p className="text-sm text-tinta-2">{t.steps.length} pasos</p>
                              {visible ? (
                                <Insignia tipo={t.status === "borrador" ? "borrador" : t.status === "revisada" ? "revisada" : "verificada"}>{etiquetaEstadoTarjeta(t)}</Insignia>
                              ) : (
                                <Insignia tipo="sin-respuesta">{MENSAJE_EN_VERIFICACION}</Insignia>
                              )}
                            </div>
                          </>
                        );
                        return (
                          <li key={t.id}>
                            {visible ? (
                              <Link href={`/tarjetas/${t.id}`} className="block overflow-hidden rounded-xl border border-borde bg-superficie no-underline shadow-suave transition-shadow hover:border-marca hover:shadow-md">
                                {contenido}
                              </Link>
                            ) : (
                              <div className="overflow-hidden rounded-xl border border-dashed border-borde-fuerte bg-superficie" aria-disabled="true">
                                {contenido}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs text-tinta-2">Ilustraciones generadas con IA: siga siempre el texto.</p>
    </div>
  );
}
