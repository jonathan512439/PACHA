import "server-only";
import { db } from "@/lib/supabase";
import { ESTADOS_TARJETA_ENVIABLES, type Factor } from "@/contratos/tipos";

/** Resumen de tarjeta que se le muestra a Gemini para que elija ids (nunca los pasos: no debe reescribirlos). */
export type TarjetaResumen = { id: string; title: string; hazard: string; phase: string; factor_tags: Factor[] };

/** Tarjetas que el bot puede enviar: estado `verificada` o `revisada`. */
export async function tarjetasEnviables(): Promise<TarjetaResumen[]> {
  const { data, error } = await db()
    .from("lessons")
    .select("id, title, hazard, phase, factor_tags")
    .in("status", [...ESTADOS_TARJETA_ENVIABLES])
    .order("id");
  if (error) throw new Error(`No se pudieron leer las tarjetas: ${error.message}`);
  return (data ?? []) as TarjetaResumen[];
}
