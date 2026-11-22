"use client";
import { useActionState } from "react";
import { Aviso, Boton, Campo } from "@/components/ui";
import { ingresar, type EstadoIngreso } from "./acciones";

export function FormIngresar({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState<EstadoIngreso, FormData>(ingresar, { error: null, usuario: "" });
  return (
    <form action={accion} className="space-y-4" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      {estado.error && <Aviso nivel="error">{estado.error}</Aviso>}
      <Campo
        etiqueta="Usuario"
        name="usuario"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={estado.usuario}
      />
      <Campo etiqueta="Contraseña" name="clave" type="password" autoComplete="current-password" required />
      <Boton type="submit" tamano="lg" className="w-full" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>
    </form>
  );
}
