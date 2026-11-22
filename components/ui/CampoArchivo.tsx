"use client";
import { Camera, FileCheck2, FileUp, ImageUp } from "lucide-react";
import { useId, useState } from "react";
import { cx } from "./cx";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Selector de archivo con aspecto de botón (el `<input type="file">` nativo no parece un botón).
 * El input real sigue dentro del formulario (FormData lo lee igual); solo se oculta visualmente.
 * Muestra el nombre y el tamaño del archivo elegido.
 */
export function CampoArchivo({
  name,
  etiqueta,
  ayuda,
  accept,
  required,
  capture,
  tipo = "documento",
  className,
}: {
  name: string;
  etiqueta: string;
  ayuda?: string;
  accept?: string;
  required?: boolean;
  capture?: "environment" | "user";
  tipo?: "documento" | "foto";
  className?: string;
}) {
  const id = useId();
  const [archivo, setArchivo] = useState<File | null>(null);
  const Icono = archivo ? FileCheck2 : tipo === "foto" ? (capture ? Camera : ImageUp) : FileUp;
  return (
    <div className={cx("space-y-1.5", className)}>
      <span id={`${id}-et`} className="block text-sm font-semibold text-tinta">
        {etiqueta}
        {required && <span className="text-roja" aria-hidden="true"> *</span>}
      </span>
      <label
        htmlFor={id}
        className={cx(
          "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-2.5 transition-colors",
          "focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-marca",
          archivo ? "border-verde bg-verde-suave hover:bg-verde-suave/70" : "border-marca/60 bg-marca-suave hover:border-marca hover:bg-marca-suave/70",
        )}
      >
        <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-md text-white", archivo ? "bg-verde" : "bg-marca")}>
          <Icono aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          {archivo ? (
            <>
              <span className="block truncate font-semibold text-verde-tinta">{archivo.name}</span>
              <span className="block text-xs text-tinta-2">{kb(archivo.size)} · toca para cambiarlo</span>
            </>
          ) : (
            <>
              <span className="block font-semibold text-marca">{tipo === "foto" ? "Elegir o tomar una foto" : "Elegir archivo"}</span>
              {ayuda && <span className="block text-xs text-tinta-2">{ayuda}</span>}
            </>
          )}
        </span>
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          required={required}
          capture={capture}
          aria-labelledby={`${id}-et`}
          className="sr-only"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
