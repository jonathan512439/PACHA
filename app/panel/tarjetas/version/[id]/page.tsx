import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Aviso, CLASES_CONTROL } from "@/components/ui";
import { FormAccion } from "@/components/panel/Acciones";
import { textoPedirAyuda, type FuentePaso } from "@/contratos/tipos";
import { accesoActual } from "@/lib/acceso-panel";
import { enlaceAPagina, mismasImagenes, validarContenido, type ContenidoTarjeta } from "@/lib/editor-tarjetas-contenido";
import { fuentesRegistradas, obtenerVersion } from "@/lib/editor-tarjetas";
import { fuentesDeDoc, type Fuente } from "@/lib/fuentes";
import { BUCKET_IMAGENES, baseStorage, urlPublica } from "@/lib/tarjeta-publica";
import { obtenerTarjeta } from "@/lib/tarjetas";
import { devolver, publicar } from "../../acciones";

export const metadata: Metadata = { title: "Verificar versión" };

export default function PaginaVersion({ params }: PageProps<"/panel/tarjetas/version/[id]">) {
  return (
    <Suspense fallback={<p className="text-tinta-2">Cargando…</p>}>
      <Revision params={params} />
    </Suspense>
  );
}

function Cita({ f, fuentes }: { f: FuentePaso | null | undefined; fuentes: Fuente[] }) {
  if (!f) return <p className="text-sm text-tinta-2">Sin fuente (texto fijo del equipo).</p>;
  const enlaces = fuentesDeDoc(f.doc, fuentes).map((x) => ({ x, url: enlaceAPagina(x.url, f.page) }));
  return (
    <p className="text-sm text-tinta-2">
      Fuente: {f.doc} — <strong>{f.page}</strong>{" "}
      {enlaces.map(({ x, url }) => url
        ? <a key={x.id} href={url} target="_blank" rel="noreferrer" className="underline">abrir {x.institucion} en esa página</a>
        : <span key={x.id}>({x.institucion}: sin enlace)</span>)}
    </p>
  );
}

function Bloque({ titulo, nuevo, antes, f, fuentes }: { titulo: string; nuevo: string; antes?: string | null; f: FuentePaso | null | undefined; fuentes: Fuente[] }) {
  const cambio = antes !== undefined && antes !== nuevo;
  return (
    <div className="space-y-1 rounded-lg border border-borde bg-superficie p-3">
      <p className="text-sm font-semibold">{titulo}{cambio ? " · cambia" : ""}</p>
      {cambio && antes && <p className="text-sm text-tinta-2 line-through">{antes}</p>}
      <p>{nuevo}</p>
      <Cita f={f} fuentes={fuentes} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> Lo encontré en la página citada</label>
    </div>
  );
}

type ConImagenes = Pick<ContenidoTarjeta, "header_image_path" | "step_image_paths">;

/** Imágenes de la versión (solo si cambian): la nueva junto a la vigente, para revisar que no tengan texto, personas ni manos. */
function Imagenes({ c, vigente }: { c: ContenidoTarjeta; vigente: ConImagenes | null }) {
  const antes: ConImagenes = vigente ?? { header_image_path: null, step_image_paths: [] };
  if (mismasImagenes(c, antes)) return null;
  const base = baseStorage(process.env.SUPABASE_URL);
  const filas = [
    { titulo: "Encabezado", nueva: c.header_image_path ?? null, vieja: antes.header_image_path ?? null, ancho: true },
    ...c.steps.map((_, i) => ({ titulo: `Paso ${i + 1}`, nueva: c.step_image_paths?.[i] ?? null, vieja: antes.step_image_paths?.[i] ?? null, ancho: false })),
  ].filter((x) => x.nueva !== x.vieja);
  const Miniatura = ({ ruta, ancho, tachada }: { ruta: string | null; ancho: boolean; tachada?: boolean }) => {
    const src = urlPublica(base, BUCKET_IMAGENES, ruta);
    return (
      <span className={`flex items-center justify-center overflow-hidden rounded-md border border-borde bg-superficie-2 text-xs text-tinta-2 ${ancho ? "aspect-video w-36" : "aspect-square w-20"} ${tachada ? "opacity-50" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage */}
        {src ? <img src={src} alt="" className="size-full object-cover" /> : "sin imagen"}
      </span>
    );
  };
  return (
    <div className="space-y-3 rounded-lg border border-borde bg-superficie p-3">
      <p className="text-sm font-semibold">Imágenes · cambian</p>
      <ul className="space-y-3">
        {filas.map((x) => (
          <li key={x.titulo} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="w-24 font-semibold">{x.titulo}</span>
            <Miniatura ruta={x.vieja} ancho={x.ancho} tachada />
            <span aria-hidden="true">→</span>
            <Miniatura ruta={x.nueva} ancho={x.ancho} />
            <span className="text-tinta-2">{x.nueva ? (x.vieja ? "se cambia" : "se agrega") : x.ancho ? "se quita (usará el encabezado de respaldo)" : "se quita (mostrará un ícono)"}</span>
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> Las imágenes nuevas no tienen texto, personas ni manos</label>
    </div>
  );
}

async function Revision({ params }: Pick<PageProps<"/panel/tarjetas/version/[id]">, "params">) {
  await connection();
  const { id } = await params;
  const [v, acceso, fuentes] = await Promise.all([obtenerVersion(id), accesoActual(), fuentesRegistradas()]);
  if (!v) return <Aviso nivel="error">No existe esa versión.</Aviso>;
  const c = v.contenido;
  const vigente = await obtenerTarjeta(c.id);
  const problemas = validarContenido(c, fuentes);
  const esAutor = acceso?.usuario === v.created_by;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Verificar: {c.title}</h1>
      <p className="text-tinta-2">
        {c.id} · {vigente ? (vigente.status === "borrador" ? "la tarjeta hoy no está publicada" : "reemplaza a la versión publicada") : "tarjeta nueva"} ·
        redactó <strong>{v.created_by}</strong> · motivo: {v.motivo} · estado: <strong>{v.estado}</strong>
      </p>
      {problemas.length > 0 && <Aviso nivel="error" titulo="No se puede publicar">{problemas.join(" · ")}</Aviso>}
      <Aviso nivel="info">
        Abre cada fuente en la página citada y comprueba que <strong>lo que dice el texto está ahí</strong>. Puede estar dicho con otras
        palabras, pero no puede agregar nada. Además: imperativo, 18 palabras como máximo y sin dosis, medicinas ni diagnósticos.
      </Aviso>

      {c.por_que && <Bloque titulo="Por qué importa" nuevo={c.por_que.texto} antes={vigente ? vigente.por_que?.texto ?? null : undefined} f={c.por_que.fuente} fuentes={fuentes} />}
      {c.steps.map((paso, i) => (
        <Bloque key={i} titulo={`Paso ${i + 1}`} nuevo={paso} antes={vigente ? vigente.steps[i] ?? null : undefined} f={c.step_sources[i]} fuentes={fuentes} />
      ))}
      {vigente && vigente.steps.length > c.steps.length && (
        <p className="text-sm text-tinta-2">
          {vigente.steps.length - c.steps.length === 1
            ? `Se quita el paso ${vigente.steps.length} de la versión vigente.`
            : `Se quitan los pasos ${c.steps.length + 1} a ${vigente.steps.length} de la versión vigente.`}
        </p>
      )}
      {(c.evitar ?? []).map((e, i) => (
        <Bloque key={`e${i}`} titulo={`Evita ${i + 1}`} nuevo={e.texto} antes={vigente ? vigente.evitar?.[i]?.texto ?? null : undefined} f={e.fuente} fuentes={fuentes} />
      ))}
      <Bloque titulo="Pide ayuda si…" nuevo={textoPedirAyuda(c)} f={c.pedir_ayuda?.fuente} fuentes={fuentes} />
      <Imagenes c={c} vigente={vigente} />

      {v.estado === "borrador" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2 rounded-lg border-2 border-verde p-4">
            <h2 className="text-lg font-semibold">Verificar y publicar</h2>
            {esAutor ? (
              <Aviso nivel="atencion">Tú redactaste esta versión: tiene que verificarla otra persona.</Aviso>
            ) : (
              <FormAccion accion={publicar.bind(null, v.id)} boton="Verificar y publicar">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="cotejado" value="si" required className="mt-1" />
                  <span>Cotejé cada texto con la página citada de su fuente. Firmo como <strong>{acceso?.usuario}</strong>.</span>
                </label>
                <label className="block text-sm">Observación (opcional)
                  <input name="observacion" className={CLASES_CONTROL} />
                </label>
              </FormAccion>
            )}
          </section>
          <section className="space-y-2 rounded-lg border border-borde p-4">
            <h2 className="text-lg font-semibold">Devolver para corregir</h2>
            <FormAccion accion={devolver.bind(null, v.id)} boton="Devolver">
              <label className="block text-sm">Qué hay que corregir
                <input name="observacion" required minLength={5} className={CLASES_CONTROL} />
              </label>
            </FormAccion>
          </section>
        </div>
      )}
      {v.estado !== "borrador" && v.observacion && <Aviso nivel="info">Observación: {v.observacion}</Aviso>}
    </div>
  );
}
