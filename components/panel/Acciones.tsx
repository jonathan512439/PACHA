"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { Resultado } from "@/app/panel/acciones";

const estilos = {
  primario: "bg-emerald-800 text-white hover:bg-emerald-900",
  peligro: "bg-red-700 text-white hover:bg-red-800",
  secundario: "bg-white border border-stone-300 hover:bg-stone-50",
} as const;

function Aviso({ r }: { r: Resultado | null }) {
  if (!r) return null;
  return <p role="status" className={`text-sm ${r.ok ? "text-emerald-800" : "text-red-700"}`}>{r.mensaje}</p>;
}

/** Botón que ejecuta una Server Action sin argumentos (ya enlazada con .bind) y refresca la página. */
export function BotonAccion({ accion, children, confirmar, variante = "primario", deshabilitado }: {
  accion: () => Promise<Resultado>; children: ReactNode; confirmar?: string; variante?: keyof typeof estilos; deshabilitado?: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [r, setR] = useState<Resultado | null>(null);
  return (
    <div className="space-y-1">
      <button type="button" disabled={pendiente || deshabilitado}
        onClick={() => { if (confirmar && !confirm(confirmar)) return; iniciar(async () => { setR(await accion()); router.refresh(); }); }}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${estilos[variante]}`}>
        {pendiente ? "Procesando…" : children}
      </button>
      <Aviso r={r} />
    </div>
  );
}

/** Formulario que envía su FormData a una Server Action (subir PDF, corregir datos). */
export function FormAccion({ accion, children, boton, className = "" }: {
  accion: (f: FormData) => Promise<Resultado>; children: ReactNode; boton: string; className?: string;
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
      <button type="submit" disabled={pendiente} className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${estilos.primario}`}>
        {pendiente ? "Procesando…" : boton}
      </button>
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
    <form className="grid gap-2 sm:grid-cols-[auto_auto_1fr_auto] items-end rounded-lg bg-stone-50 p-3" onSubmit={(e) => {
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
      <label className="text-sm">Tipo
        <select name="kind" value={tipo} onChange={(e) => setTipo(e.target.value as "cisterna" | "forraje")} className="block rounded border border-stone-300 px-2 py-1">
          <option value="cisterna">Cisterna de agua</option>
          <option value="forraje">Forraje (kg)</option>
        </select>
      </label>
      <label className="text-sm">{tipo === "cisterna" ? "Cisternas" : "Kilos"}
        <input name="quantity" type="number" min="1" step="1" required defaultValue={tipo === "cisterna" ? 1 : 200} className="block w-24 rounded border border-stone-300 px-2 py-1" />
      </label>
      <label className="text-sm">Foto (sin personas)
        <input name="foto" type="file" accept="image/*" capture="environment" className="block text-xs" />
      </label>
      <button type="submit" disabled={pendiente} className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${estilos.primario}`}>
        {pendiente ? "Registrando…" : "Registrar entrega"}
      </button>
      <div className="sm:col-span-4"><Aviso r={r} /></div>
    </form>
  );
}
