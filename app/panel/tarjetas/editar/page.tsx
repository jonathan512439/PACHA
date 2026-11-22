import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Aviso, CLASES_CONTROL } from "@/components/ui";
import { FormAccion } from "@/components/panel/Acciones";
import { CampoImagenTarjeta } from "@/components/panel/CampoImagenTarjeta";
import { AMENAZAS, FACTORES, FASES, PASOS_MAX, PEDIR_AYUDA_FIJO, type FuentePaso } from "@/contratos/tipos";
import { fuentesRegistradas } from "@/lib/editor-tarjetas";
import type { Fuente } from "@/lib/fuentes";
import { etiquetaFactor } from "@/lib/problemas-agrupar";
import { BUCKET_IMAGENES, baseStorage, urlPublica } from "@/lib/tarjeta-publica";
import { obtenerTarjeta } from "@/lib/tarjetas";
import { guardarVersion } from "../acciones";

export const metadata: Metadata = { title: "Editar tarjeta" };

export default function PaginaEditar({ searchParams }: PageProps<"/panel/tarjetas/editar">) {
  return (
    <Suspense fallback={<p className="text-tinta-2">Cargando…</p>}>
      <Editor searchParams={searchParams} />
    </Suspense>
  );
}

const FASE: Record<string, string> = { antes_familia: "Antes (familia, agua, cultivos)", antes_animales: "Antes (animales)", durante: "Durante", despues: "Después" };

/** Selector de fuente + página. Si el texto citado no es exactamente una "clave", se conserva como opción. */
function SelectorFuente({ nombre, fuentes, valor }: { nombre: string; fuentes: Fuente[]; valor: FuentePaso | null | undefined }) {
  const claves = fuentes.map((f) => f.claves[0]);
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
      <label className="block text-sm">
        Fuente
        <select name={`${nombre}_fuente`} defaultValue={valor?.doc ?? ""} className={CLASES_CONTROL}>
          <option value="">— elegir —</option>
          {valor?.doc && !claves.includes(valor.doc) && <option value={valor.doc}>{valor.doc}</option>}
          {fuentes.map((f) => (
            <option key={f.id} value={f.claves[0]}>{f.institucion} ({f.anio}) · {f.titulo.slice(0, 70)}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Página
        <input name={`${nombre}_pagina`} defaultValue={valor?.page ?? ""} placeholder="p. 39" className={CLASES_CONTROL} />
      </label>
    </div>
  );
}

async function Editor({ searchParams }: Pick<PageProps<"/panel/tarjetas/editar">, "searchParams">) {
  await connection();
  const sp = await searchParams;
  const id = typeof sp.id === "string" ? sp.id : "";
  const [t, fuentes] = await Promise.all([id ? obtenerTarjeta(id) : Promise.resolve(null), fuentesRegistradas()]);
  if (id && !t) return <Aviso nivel="error">No existe la tarjeta {id}.</Aviso>;
  const base = baseStorage(process.env.SUPABASE_URL);
  const url = (ruta: string | null | undefined) => urlPublica(base, BUCKET_IMAGENES, ruta);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t ? `Nueva versión de «${t.title}»` : "Nueva tarjeta"}</h1>
      <Aviso nivel="info" titulo="Reglas">
        De 3 a 5 pasos, en imperativo y con 18 palabras como máximo. Sin dosis, medicinas ni diagnósticos. <strong>Cada texto lleva
        fuente y página</strong>: si no está en la página citada, no entra. Si la fuente no está en la lista, regístrala primero en Fuentes.
        Al guardar queda en borrador; la versión vigente se sigue enviando hasta que otra persona verifique la nueva.
      </Aviso>

      <FormAccion accion={guardarVersion} boton="Guardar versión en borrador" className="space-y-6">
        {t ? (
          <>
            <input type="hidden" name="id" value={t.id} />
          </>
        ) : (
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-1 font-semibold">Identificación</legend>
            <label className="block text-sm">Amenaza
              <select name="amenaza" className={CLASES_CONTROL}>{AMENAZAS.map((a) => <option key={a} value={a}>{a}</option>)}</select>
            </label>
            <label className="block text-sm">Momento
              <select name="fase" className={CLASES_CONTROL}>{FASES.map((f) => <option key={f} value={f}>{FASE[f]}</option>)}</select>
            </label>
            <label className="block text-sm">Número
              <input name="numero" type="number" min={1} max={99} defaultValue={1} className={CLASES_CONTROL} />
            </label>
          </fieldset>
        )}

        <label className="block font-semibold">Título
          <input name="titulo" required maxLength={80} defaultValue={t?.title ?? ""} className={CLASES_CONTROL} />
        </label>

        <fieldset className="space-y-3 rounded-lg border border-borde p-3">
          <legend className="px-1 font-semibold">Imágenes</legend>
          <p className="text-sm text-tinta-2">
            Ilustraciones <strong>sin texto, sin personas y sin manos</strong>; se publican con la nota «Ilustraciones generadas con IA».
            La imagen de cada paso se elige dentro del paso. Se achican y se limpian (sin ubicación) antes de subir; las nuevas
            se publican recién cuando otra persona verifica la versión.
          </p>
          <CampoImagenTarjeta
            nombre="header"
            etiqueta="Encabezado (horizontal, 16:9)"
            rutaActual={t?.header_image_path ?? null}
            urlActual={url(t?.header_image_path)}
            formato="horizontal"
            sinImagen="Sin imagen: se usa el encabezado de respaldo."
          />
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-semibold">Por qué importa (opcional, con fuente)</legend>
          <textarea name="por_que" rows={2} defaultValue={t?.por_que?.texto ?? ""} className={CLASES_CONTROL} />
          <SelectorFuente nombre="por_que" fuentes={fuentes} valor={t?.por_que?.fuente} />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-semibold">Pasos (de 3 a 5; los vacíos no se guardan)</legend>
          {Array.from({ length: PASOS_MAX }, (_, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-borde p-3">
              <label className="block text-sm font-semibold">Paso {i + 1}
                <textarea name={`paso${i + 1}`} rows={2} defaultValue={t?.steps[i] ?? ""} className={CLASES_CONTROL} />
              </label>
              <SelectorFuente nombre={`paso${i + 1}`} fuentes={fuentes} valor={t?.step_sources[i]} />
              <CampoImagenTarjeta
                nombre={`paso${i + 1}`}
                etiqueta={`Imagen del paso ${i + 1} (cuadrada)`}
                rutaActual={t?.step_image_paths?.[i] ?? null}
                urlActual={url(t?.step_image_paths?.[i])}
                formato="cuadrada"
                sinImagen="Sin imagen: se muestra un ícono."
              />
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-semibold">Evita (0 a 2, solo si la fuente lo dice)</legend>
          {[1, 2].map((n) => (
            <div key={n} className="space-y-2">
              <textarea name={`evitar${n}`} rows={1} defaultValue={t?.evitar?.[n - 1]?.texto ?? ""} className={CLASES_CONTROL} />
              <SelectorFuente nombre={`evitar${n}`} fuentes={fuentes} valor={t?.evitar?.[n - 1]?.fuente} />
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-semibold">Pide ayuda si… (si queda vacío se usa el texto fijo)</legend>
          <textarea name="pedir_ayuda" rows={2} defaultValue={t?.pedir_ayuda?.texto ?? ""} placeholder={PEDIR_AYUDA_FIJO} className={CLASES_CONTROL} />
          <SelectorFuente nombre="pedir_ayuda" fuentes={fuentes} valor={t?.pedir_ayuda?.fuente} />
        </fieldset>

        <fieldset>
          <legend className="font-semibold">Problemas que atiende (para el bot y el panel)</legend>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {FACTORES.filter((f) => f !== "otro").map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="factor" value={f} defaultChecked={t?.factor_tags.includes(f)} /> {etiquetaFactor(f)}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block font-semibold">Motivo del cambio (queda en el historial)
          <input name="motivo" required minLength={5} placeholder="p. ej. La OPS indica hervir más tiempo en altura" className={CLASES_CONTROL} />
        </label>
      </FormAccion>
    </div>
  );
}
