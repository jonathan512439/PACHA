import "server-only";
import { db } from "@/lib/supabase";
import { urlApp } from "@/lib/url";
import { Tarjeta, type Factor } from "@/contratos/tipos";
import {
  ID_ENCABEZADO_RESPALDO,
  estadosPublicables,
  permitirBorrador,
  tarjetaASalidaBot,
} from "@/lib/tarjeta-publica";

/** Resumen de tarjeta que se le muestra a Gemini para que elija ids (nunca los pasos: no debe reescribirlos). */
export type TarjetaResumen = { id: string; title: string; hazard: string; phase: string; factor_tags: Factor[] };

/**
 * Tarjetas que el bot puede enviar: estado `verificada` o `revisada`.
 * Con DEMO_PERMITIR_BORRADOR=1 también `borrador` (y entonces salen con la etiqueta, ver tarjetaASalidaBot).
 */
export async function tarjetasEnviables(): Promise<TarjetaResumen[]> {
  const { data, error } = await db()
    .from("lessons")
    .select("id, title, hazard, phase, factor_tags")
    .in("status", [...estadosPublicables(permitirBorrador())])
    .order("id");
  if (error) throw new Error(`No se pudieron leer las tarjetas: ${error.message}`);
  return (data ?? []) as TarjetaResumen[];
}

/**
 * Todas las columnas. v0.4: con "*" la lectura funciona antes Y después de aplicar la migración
 * 2026-11-22_tarjetas_v0.4.sql (por_que, evitar, pedir_ayuda). Sin la migración esos campos no llegan (undefined).
 * Zod descarta las columnas que no son del contrato (created_at).
 */
const COLUMNAS = "*";

/** Convierte una fila de `lessons` en Tarjeta validada. Una fila inválida se trata como inexistente (y se registra). */
function aTarjeta(fila: Record<string, unknown>): Tarjeta | null {
  const r = Tarjeta.safeParse({ ...fila, source_url: fila.source_url ?? undefined });
  if (!r.success) {
    console.error(`Tarjeta ${String(fila.id)} no valida con el contrato:`, r.error.issues.map((i) => i.message).join("; "));
    return null;
  }
  return r.data;
}

/** Una tarjeta por id, SIN aplicar la regla de publicación (la aplica quien la muestra). */
export async function obtenerTarjeta(id: string): Promise<Tarjeta | null> {
  const { data, error } = await db().from("lessons").select(COLUMNAS).eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo leer la tarjeta ${id}: ${error.message}`);
  return data ? aTarjeta(data as unknown as Record<string, unknown>) : null;
}

/** Todas las tarjetas (para /tarjetas y los scripts). */
export async function listarTarjetas(): Promise<Tarjeta[]> {
  const { data, error } = await db().from("lessons").select(COLUMNAS).order("id");
  if (error) throw new Error(`No se pudieron leer las tarjetas: ${error.message}`);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(aTarjeta).filter((t): t is Tarjeta => t !== null);
}

/** Ruta en Storage del encabezado de respaldo (el de helada-antes_animales-01). */
export async function rutaEncabezadoRespaldo(): Promise<string | null> {
  const { data } = await db().from("lessons").select("header_image_path").eq("id", ID_ENCABEZADO_RESPALDO).maybeSingle();
  return (data?.header_image_path as string | null | undefined) ?? null;
}

/** SalidaBot de una tarjeta por id, con la regla de publicación aplicada. null = no se envía. */
export async function salidaTarjeta(id: string) {
  const t = await obtenerTarjeta(id);
  if (!t) return null;
  return tarjetaASalidaBot(t, { permitirBorrador: permitirBorrador(), supabaseUrl: process.env.SUPABASE_URL, urlSitio: urlApp() });
}
