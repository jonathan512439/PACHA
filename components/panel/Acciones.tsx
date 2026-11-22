"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { CircleCheck, CircleX, LoaderCircle, Truck } from "lucide-react";
import type { Resultado } from "@/app/panel/acciones";
import { clasesBoton } from "@/components/ui/Boton";
import { CLASES_CONTROL } from "@/components/ui/Campo";
import { CampoArchivo } from "@/components/ui/CampoArchivo";

const estilos = {
  primario: clasesBoton("primario", "md"),
  peligro: clasesBoton("peligro", "md"),
  secundario: clasesBoton("secundario", "md"),
} as const;

function Aviso({ r }: { r: Resultado | null }) {
  if (!r) return null;
  const Icono = r.ok ? CircleCheck : CircleX;
  return (
    <p role="status" className={`flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium ${r.ok ? "bg-verde-suave text-verde-tinta" : "bg-roja-suave text-roja-tinta"}`}>
      <Icono aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {r.mensaje}
    </p>
  );
}

const Cargando = ({ texto }: { texto: string }) => (
  <>
    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
    {texto}
  </>
);

/** Botón que ejecuta una Server Action sin argumentos (ya enlazada con .bind) y refresca la página. */
export function BotonAccion({ accion, children, confirmar, variante = "primario", deshabilitado, icono }: {
  accion: () => Promise<Resultado>; children: ReactNode; confirmar?: string; variante?: keyof typeof estilos; deshabilitado?: boolean; icono?: ReactNode;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [r, setR] = useState<Resultado | null>(null);
  return (
    <div className="space-y-1">
      <button type="button" disabled={pendiente || deshabilitado}
        onClick={() => { if (confirmar && !confirm(confirmar)) return; iniciar(async () => { setR(await accion()); router.refresh(); }); }}
        className={`${estilos[variante]} text-sm`}>
        {pendiente ? <Cargando texto="Procesando…" /> : <>{icono}{children}</>}
      </button>
      <Aviso r={r} />
    </div>
  );
}

/** Formulario que envía su FormData a una Server Action (subir PDF, corregir datos). */
export function FormAccion({ accion, children, boton, className = "", icono, variante = "primario" }: {
  accion: (f: FormData) => Promise<Resultado>; children: ReactNode; boton: string; className?: string; icono?: ReactNode; variante?: keyof typeof estilos;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [r, setR] = useState<Resultado | null>(null);
  return (
    <form className={`space-y-2 ${className}`} onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      iniciar(async () => { setR(await accion(f)); router.refresh(); });
    }}>
      {children}
      <div className="sm:col-span-full">
        <button type="submit" disabled={pendiente} className={`${estilos[variante]} text-sm`}>
          {pendiente ? <Cargando texto="Procesando…" /> : <>{icono}{boton}</>}
        </button>
      </div>
      <Aviso r={r} />
    </form>
  );
}

/**
 * Re-codifica la foto en el navegador (canvas -> WEBP, máx. 1600 px): borra los datos EXIF (ubicación GPS)
 * y la deja por debajo del límite de las Server Actions.
 */
async function limpiarFoto(f: File): Promise<File> {
  const img = await createImageBitmap(f);
  const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala); canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la foto"))), "image/webp", 0.82));
  return new File([blob], "entrega.webp", { type: "image/webp" });
}

/** Registrar entrega de un reporte: tipo, cantidad y foto (limpia de EXIF antes de subir). */
export function FormEntrega({ accion, communityId, reportId, sugerido }: {
  accion: (f: FormData) => Promise<Resultado>; communityId: string; reportId: string; sugerido: "cisterna" | "forraje";
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [r, setR] = useState<Resultado | null>(null);
  const [tipo, setTipo] = useState<"cisterna" | "forraje">(sugerido);
  return (
    <form className="space-y-3 rounded-lg border border-borde bg-superficie-2 p-3" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      iniciar(async () => {
        const foto = f.get("foto");
        if (foto instanceof File && foto.size > 0) {
          try { f.set("foto", await limpiarFoto(foto)); } catch (err) { setR({ ok: false, mensaje: String(err) }); return; }
        }
        setR(await accion(f)); router.refresh();
      });
    }}>
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="reportId" value={reportId} />
      <p className="flex items-center gap-2 text-sm font-semibold text-tinta"><Truck aria-hidden="true" className="size-4 text-marca" />Registrar la entrega</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_8rem_minmax(0,1fr)] sm:items-end">
        <label className="block space-y-1.5 text-sm font-semibold text-tinta">
          <span>Tipo</span>
          <select name="kind" value={tipo} onChange={(e) => setTipo(e.target.value as "cisterna" | "forraje")} className={CLASES_CONTROL}>
            <option value="cisterna">Cisterna de agua</option>
            <option value="forraje">Forraje (kg)</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-tinta">
          <span>{tipo === "cisterna" ? "Cisternas" : "Kilos"}</span>
          <input name="quantity" type="number" min="1" step="1" required defaultValue={tipo === "cisterna" ? 1 : 200} className={CLASES_CONTROL} />
        </label>
        <CampoArchivo name="foto" etiqueta="Foto (sin personas)" tipo="foto" accept="image/*" capture="environment" ayuda="Se borra la ubicación antes de subirla." />
      </div>
      <button type="submit" disabled={pendiente} className={`${estilos.primario} text-sm`}>
        {pendiente ? <Cargando texto="Registrando…" /> : <><Truck aria-hidden="true" className="size-4" />Registrar entrega</>}
      </button>
      <Aviso r={r} />
    </form>
  );
}
