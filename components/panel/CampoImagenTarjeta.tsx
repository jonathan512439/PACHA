"use client";
import { ImageOff, ImageUp, LoaderCircle, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";

/**
 * Re-codifica la imagen en el navegador (canvas → WebP): borra los metadatos (EXIF/GPS), la achica a `maxLado`
 * y la deja liviana para la Server Action (límite 4 MB entre todas).
 */
async function optimizar(f: File, maxLado: number, nombre: string): Promise<File> {
  const img = await createImageBitmap(f);
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la imagen"))), "image/webp", 0.8),
  );
  return new File([blob], `${nombre}.webp`, { type: "image/webp" });
}

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;

/**
 * Imagen de una tarjeta en el editor (encabezado o un paso): muestra la actual y permite subir otra, cambiarla o quitarla.
 * Envía `${nombre}_imagen` (ruta que se conserva, vacía si se quita) y `${nombre}_archivo` (imagen nueva ya optimizada).
 * Nada se publica al guardar: va en la versión en borrador y se publica cuando otra persona la verifica.
 */
export function CampoImagenTarjeta({
  nombre,
  etiqueta,
  rutaActual,
  urlActual,
  formato,
  sinImagen,
}: {
  nombre: string;
  etiqueta: string;
  rutaActual: string | null;
  urlActual: string | null;
  formato: "horizontal" | "cuadrada";
  sinImagen: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [nueva, setNueva] = useState<{ archivo: File; url: string } | null>(null);
  const [quitada, setQuitada] = useState(false);
  const [estado, setEstado] = useState<"listo" | "procesando" | "error">("listo");

  useEffect(() => () => { if (nueva) URL.revokeObjectURL(nueva.url); }, [nueva]);

  async function elegir(f: File | undefined) {
    if (!f || !input.current) return;
    setEstado("procesando");
    try {
      const optimizada = await optimizar(f, formato === "horizontal" ? 1600 : 900, nombre);
      const dt = new DataTransfer();
      dt.items.add(optimizada);
      input.current.files = dt.files; // el formulario envía la versión optimizada, no la original
      setNueva({ archivo: optimizada, url: URL.createObjectURL(optimizada) });
      setQuitada(false);
      setEstado("listo");
    } catch {
      input.current.value = "";
      setEstado("error");
    }
  }

  function deshacer() {
    if (input.current) input.current.value = "";
    setNueva(null);
    setQuitada(false);
    setEstado("listo");
  }

  const vista = nueva?.url ?? (quitada ? null : urlActual);
  const boton = "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-semibold";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input type="hidden" name={`${nombre}_imagen`} value={quitada ? "" : (rutaActual ?? "")} />
      <div
        className={cx(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-borde bg-superficie-2",
          formato === "horizontal" ? "aspect-video w-36" : "aspect-square w-20",
        )}
      >
        {vista ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa (blob: o Storage), no necesita optimización
          <img src={vista} alt="" className="size-full object-cover" />
        ) : (
          <ImageOff aria-hidden="true" className="size-6 text-tinta-2" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-tinta">{etiqueta}</p>
        <p className="text-xs text-tinta-2" aria-live="polite">
          {estado === "procesando"
            ? "Preparando la imagen…"
            : estado === "error"
              ? "No se pudo leer esa imagen. Prueba con un JPG, PNG o WebP."
              : nueva
                ? `Nueva (${kb(nueva.archivo.size)}): se guarda con la versión en borrador.`
                : quitada
                  ? `Se quitará al publicar. ${sinImagen}`
                  : urlActual
                    ? "Imagen actual."
                    : sinImagen}
        </p>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={id} className={cx(boton, "border-marca bg-marca-suave text-marca hover:bg-marca hover:text-white focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-marca")}>
            {estado === "procesando" ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : vista ? (
              <RefreshCw aria-hidden="true" className="size-4" />
            ) : (
              <ImageUp aria-hidden="true" className="size-4" />
            )}
            {vista ? "Cambiar" : "Subir imagen"}
            <input
              ref={input}
              id={id}
              name={`${nombre}_archivo`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label={`${vista ? "Cambiar" : "Subir"} ${etiqueta.toLowerCase()}`}
              disabled={estado === "procesando"}
              onChange={(e) => elegir(e.target.files?.[0])}
            />
          </label>
          {(nueva || quitada) && (
            <button type="button" onClick={deshacer} className={cx(boton, "border-borde-fuerte bg-superficie text-tinta hover:bg-superficie-2")}>
              <Undo2 aria-hidden="true" className="size-4" />
              Deshacer
            </button>
          )}
          {!nueva && !quitada && rutaActual && (
            <button type="button" onClick={() => setQuitada(true)} className={cx(boton, "border-roja/40 bg-superficie text-roja-tinta hover:bg-roja-suave")}>
              <Trash2 aria-hidden="true" className="size-4" />
              Quitar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
