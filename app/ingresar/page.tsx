import type { Metadata } from "next";
import { Suspense } from "react";
import { Aviso, Boton } from "@/components/ui";
import { modoSesion, rutaSiguiente } from "@/lib/sesion";
import { FormIngresar } from "./FormIngresar";

export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false } };

export default function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  return (
    <main className="mx-auto max-w-sm px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-tinta">Panel técnico</h1>
        <p className="text-tinta-2">
          Solo para el personal del municipio. El mapa, las tarjetas y las entregas son públicos y no necesitan cuenta.
        </p>
      </div>
      <Suspense fallback={<p className="text-tinta-2">Cargando…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/ingresar">, "searchParams">) {
  const sp = await searchParams;
  if (!modoSesion()) {
    return (
      <div className="space-y-4">
        <Aviso nivel="info">Por ahora el panel pide usuario y contraseña en la ventana del navegador.</Aviso>
        <Boton href="/panel" tamano="lg" className="w-full">Ir al panel</Boton>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {sp.salio === "1" && <Aviso nivel="exito">Cerraste la sesión.</Aviso>}
      <FormIngresar siguiente={rutaSiguiente(sp.siguiente)} />
      <p className="text-sm text-tinta-2">La sesión dura 8 horas. Tras 5 intentos fallidos hay que esperar 10 minutos.</p>
    </div>
  );
}
