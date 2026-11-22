"use client";
import { Printer } from "lucide-react";
import { clasesBoton } from "./Boton";

/** Botón que abre el diálogo de impresión del navegador. No se imprime a sí mismo. */
export function BotonImprimir({ texto = "Imprimir" }: { texto?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={clasesBoton("secundario", "md", "print:hidden")}>
      <Printer aria-hidden="true" className="size-5" />
      {texto}
    </button>
  );
}
