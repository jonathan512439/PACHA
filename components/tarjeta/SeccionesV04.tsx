import { CircleAlert, Ban, LifeBuoy, ExternalLink, BadgeCheck, Volume2 } from "lucide-react";
import Link from "next/link";
import { etiquetaEstadoTarjeta, textoPedirAyuda, type FuentePaso, type Tarjeta } from "@/contratos/tipos";
import { etiquetaFuente, fuentesDeTarjeta } from "@/lib/fuentes";
import { Insignia } from "@/components/ui/Insignia";

const cita = (f: FuentePaso) => `${f.doc}, ${f.page.startsWith("p") ? f.page : `p. ${f.page}`}`;

function Seccion({ titulo, icono: Icono, children, tono = "marca" }: { titulo: string; icono: typeof Ban; children: React.ReactNode; tono?: "marca" | "roja" | "verde" }) {
  const color = { marca: "text-marca", roja: "text-roja", verde: "text-verde" }[tono];
  return (
    <section className="rounded-xl border border-borde bg-superficie p-5 shadow-suave">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icono aria-hidden="true" className={`size-5 shrink-0 ${color}`} />
        {titulo}
      </h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-tinta">{children}</div>
    </section>
  );
}

const CitaPequena = ({ f }: { f: FuentePaso }) => <p className="text-xs text-tinta-2">Fuente: {cita(f)}</p>;

/**
 * Secciones v0.4 de la tarjeta en la web: por qué importa, evita, pide ayuda si…, fuentes con enlace y estado.
 * Todas opcionales salvo "Pide ayuda" (texto fijo si la tarjeta no trae uno) y "Fuentes" (siempre).
 */
export function SeccionesV04({ tarjeta: t, audioUrl }: { tarjeta: Tarjeta; audioUrl: string | null }) {
  const fuentes = fuentesDeTarjeta(t);
  return (
    <div className="space-y-4">
      {t.por_que && (
        <Seccion titulo="Por qué importa" icono={CircleAlert}>
          <p>{t.por_que.texto}</p>
          <CitaPequena f={t.por_que.fuente} />
        </Seccion>
      )}

      {!!t.evitar?.length && (
        <Seccion titulo="Evita" icono={Ban} tono="roja">
          <ul className="space-y-2">
            {t.evitar.map((e, i) => (
              <li key={i}>
                <p>{e.texto}</p>
                <CitaPequena f={e.fuente} />
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Pide ayuda si…" icono={LifeBuoy}>
        <p>{textoPedirAyuda(t)}</p>
        {t.pedir_ayuda?.fuente && <CitaPequena f={t.pedir_ayuda.fuente} />}
        <p>
          <Link href="/probar" className="font-semibold text-marca underline">Probar el bot</Link> · <Link href="/suscribirse" className="font-semibold text-marca underline">Suscribirse</Link>
        </p>
      </Seccion>

      {audioUrl && (
        <Seccion titulo="Escuchar" icono={Volume2}>
          <audio controls preload="none" src={audioUrl} className="w-full">
            Tu navegador no puede reproducir el audio.
          </audio>
          <p className="text-xs text-tinta-2">Audio con voz sintética. Dice el título y los pasos de esta tarjeta.</p>
        </Seccion>
      )}

      <Seccion titulo="Fuentes" icono={BadgeCheck} tono="verde">
        <ul className="space-y-3">
          {fuentes.map(({ fuente: f, paginas }) => (
            <li key={f.id}>
              <p className="font-semibold">{etiquetaFuente(f)}</p>
              <p className="text-sm text-tinta-2">
                {f.titulo} · {paginas.map((p) => (p.startsWith("p") ? p : `p. ${p}`)).join(", ")}
              </p>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center text-sm font-semibold text-marca underline">
                  Abrir el documento original
                  <ExternalLink aria-hidden="true" className="ml-1 inline size-3.5 align-[-2px]" />
                  <span className="sr-only"> (abre en otra pestaña)</span>
                </a>
              ) : (
                <p className="text-sm text-tinta-2">Enlace por confirmar.{f.nota ? ` ${f.nota}` : ""}</p>
              )}
            </li>
          ))}
        </ul>
        <p className="border-t border-borde pt-2 text-sm">
          <Link href="/fuentes" className="font-semibold text-marca underline">Todas las fuentes oficiales</Link>
        </p>
      </Seccion>

      <p className="flex flex-wrap items-center gap-2 text-sm text-tinta-2">
        <Insignia tipo={t.status === "borrador" ? "borrador" : t.status === "revisada" ? "revisada" : "verificada"}>{etiquetaEstadoTarjeta(t)}</Insignia>
        Cada paso se comparó con la página citada. Ilustraciones generadas con IA: siga el texto.
      </p>
    </div>
  );
}
