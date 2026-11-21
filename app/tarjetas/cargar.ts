import "server-only";
import { connection } from "next/server";
import type { Tarjeta } from "@/contratos/tipos";
import { obtenerTarjeta, rutaEncabezadoRespaldo } from "@/lib/tarjetas";
import {
  baseStorage,
  permitirBorrador,
  puedePublicarse,
  resolverImagenes,
  type ImagenesTarjeta,
} from "@/lib/tarjeta-publica";

export type TarjetaVisible =
  | { estado: "ok"; tarjeta: Tarjeta; imagenes: ImagenesTarjeta }
  | { estado: "en_verificacion" }
  | { estado: "no_existe" };

/** Lee la tarjeta en cada petición (el estado cambia al verificarla) y aplica la regla de publicación. */
export async function cargarTarjetaVisible(id: string): Promise<TarjetaVisible> {
  await connection(); // dato de la base y variable de entorno: solo en tiempo de petición
  const tarjeta = await obtenerTarjeta(id);
  if (!tarjeta) return { estado: "no_existe" };
  if (!puedePublicarse(tarjeta, permitirBorrador())) return { estado: "en_verificacion" };
  const respaldo = await rutaEncabezadoRespaldo();
  const imagenes = resolverImagenes(tarjeta, baseStorage(process.env.SUPABASE_URL), respaldo);
  return { estado: "ok", tarjeta, imagenes };
}
