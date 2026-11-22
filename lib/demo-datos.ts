// Datos de ejemplo del demo y "Reiniciar demo". Lógica PURA (recibe el cliente): la usan el script
// `npm run seed:demo` (tsx, fuera de Next) y la acción del panel (dentro de Next con lib/supabase.ts).
// Todo lo que crea es EJEMPLO. Nunca borra suscriptores ni tarjetas.
import type { SupabaseClient } from "@supabase/supabase-js";
import { prioridad, urgencia } from "@/contratos/prioridad";

/** UUID fijos: si alguien ya se registró en una comunidad, reiniciar no rompe su suscripción. */
const id = (n: number) => `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const COMUNIDADES_EJEMPLO = [
  { id: id(1), name: "Kantuta Pampa", lat: -18.120, lon: -67.380, families: 45, animals: 900, main_activity: "camelidos" },
  { id: id(2), name: "Wila Qullu", lat: -18.150, lon: -67.470, families: 32, animals: 1200, main_activity: "camelidos" },
  { id: id(3), name: "Jach'a Uta", lat: -18.205, lon: -67.350, families: 60, animals: 700, main_activity: "mixto" },
  { id: id(4), name: "Thola Pampa", lat: -18.240, lon: -67.440, families: 28, animals: 1500, main_activity: "camelidos" },
  { id: id(5), name: "Sullka Jawira", lat: -18.100, lon: -67.450, families: 51, animals: 150, main_activity: "papa_quinua" },
  { id: id(6), name: "Ch'iyar Qala", lat: -18.270, lon: -67.380, families: 38, animals: 600, main_activity: "mixto" },
  { id: id(7), name: "Qhantati", lat: -18.170, lon: -67.520, families: 22, animals: 1100, main_activity: "camelidos" },
  { id: id(8), name: "Phuju Pampa", lat: -18.220, lon: -67.300, families: 40, animals: 200, main_activity: "papa_quinua" },
  { id: id(9), name: "Comunidad de prueba", lat: -18.300, lon: -67.480, families: 10, animals: 100, main_activity: "mixto", is_test: true },
] as const;

type ReporteEj = {
  com: number; type: "agua" | "forraje" | "dano"; horas: number; dias: number | null; familias: number | null;
  animales: number | null; factor: string; texto: string; entrega?: { kind: "cisterna" | "forraje"; quantity: number; llego: boolean | null };
};
// Kantuta Pampa (1) queda SIN reportes: es la que cambia de color en vivo en el demo.
const REPORTES_EJEMPLO: ReporteEj[] = [
  { com: 2, type: "agua", horas: 20, dias: 5, familias: 32, animales: null, factor: "pozo_o_vertiente_seca", texto: "La vertiente se secó hace cinco días, somos treinta y dos familias." },
  { com: 4, type: "forraje", horas: 30, dias: 7, familias: 28, animales: 1500, factor: "sin_reserva_forraje", texto: "Ya no hay pasto ni reserva de forraje hace una semana, tenemos como mil quinientas llamas." },
  { com: 5, type: "dano", horas: 6, dias: null, familias: 51, animales: null, factor: "perdida_por_helada", texto: "La helada quemó la papa recién emergida, somos cincuenta y una familias." },
  { com: 3, type: "agua", horas: 48, dias: 3, familias: 60, animales: null, factor: "sin_agua_consumo", texto: "Tres días sin agua para tomar.", entrega: { kind: "cisterna", quantity: 1, llego: true } },
  { com: 6, type: "forraje", horas: 40, dias: 4, familias: 38, animales: 600, factor: "sin_reserva_forraje", texto: "Se acabó el forraje, los animales están flacos.", entrega: { kind: "forraje", quantity: 300, llego: null } },
  { com: 7, type: "agua", horas: 36, dias: 4, familias: 22, animales: null, factor: "pozo_o_vertiente_seca", texto: "El pozo está seco hace cuatro días.", entrega: { kind: "cisterna", quantity: 1, llego: false } },
];

const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();

async function borrarTodo(db: SupabaseClient, tabla: string) {
  // PostgREST exige un filtro para borrar: "id no nulo" equivale a todas las filas.
  const { error } = await db.from(tabla).delete().not("id", "is", null);
  if (error) throw new Error(`${tabla}: ${error.message}`);
}

/** Fotos opcionales de C (sin EXIF), ya leídas por quien llama: { 1: bytes, 2: bytes, 3: bytes }. */
export type FotosEjemplo = Partial<Record<1 | 2 | 3, Uint8Array>>;

export async function reiniciarDemo(db: SupabaseClient, fotos: FotosEjemplo = {}) {
  // 1. Borrar lo generado durante el demo, en orden de dependencias.
  for (const t of ["alert_deliveries", "deliveries", "alerts", "reports"]) await borrarTodo(db, t);
  // Envíos por problema (v0.3.1): si la migración aún no está aplicada, la tabla no existe y se ignora.
  await db.from("lesson_sends").delete().not("id", "is", null);
  const { data: bols } = await db.from("bulletins").select("pdf_path");
  await borrarTodo(db, "bulletins");
  const rutas = (bols ?? []).map((b) => b.pdf_path as string).filter(Boolean);
  if (rutas.length) await db.storage.from("boletines").remove(rutas);

  // 2. Comunidades: upsert por id fijo (no se borran: hay suscriptores que apuntan a ellas).
  const filas = COMUNIDADES_EJEMPLO.map((c) => ({
    ...c, municipio: "Toledo", station_id: "oruro-ciudad", is_example: true, is_test: "is_test" in c ? c.is_test : false,
  }));
  const up = await db.from("communities").upsert(filas, { onConflict: "id" });
  if (up.error) throw new Error(`communities: ${up.error.message}`);

  // 3. Reportes y entregas de ejemplo.
  let nEntrega = 0;
  for (const r of REPORTES_EJEMPLO) {
    const c = COMUNIDADES_EJEMPLO[r.com - 1];
    const res = prioridad({ diasSinRecurso: r.dias, familias: r.familias ?? c.families, animales: r.animales ?? c.animals, horasDesdeReporte: 0 });
    const ins = await db.from("reports").insert({
      community_id: c.id, type: r.type, status: r.entrega ? "atendido" : "confirmado",
      payload: { tipo_reporte: r.type, comunidad_mencionada: null, dias_sin_recurso: r.dias, familias_afectadas: r.familias,
        animales_afectados: r.animales, factor: r.factor, idioma: "es", ejemplo: true },
      transcript: r.texto, confidence: 0.9, factor: r.factor,
      priority_score: res.score, priority_breakdown: { ...res, urgencia: urgencia(res.score) },
      confirmed_at: hace(r.horas), created_at: hace(r.horas), updated_by: "EJEMPLO",
      ...(r.entrega ? { attended_at: hace(r.horas - 6) } : {}),
    }).select("id").single();
    if (ins.error) throw new Error(`reports: ${ins.error.message}`);

    if (r.entrega) {
      nEntrega++;
      let photo_path: string | null = null;
      const foto = fotos[nEntrega as 1 | 2 | 3];
      if (foto) {
        photo_path = `ejemplo/entrega-${nEntrega}.jpg`;
        await db.storage.from("entregas").upload(photo_path, foto, { contentType: "image/jpeg", upsert: true });
      }
      const d = await db.from("deliveries").insert({
        report_id: ins.data.id, community_id: c.id, kind: r.entrega.kind, quantity: r.entrega.quantity,
        unit: r.entrega.kind === "cisterna" ? "cisternas" : "kg", photo_path, is_example: true, registered_by: "EJEMPLO",
        delivered_at: hace(r.horas - 6), confirmed_by_community: r.entrega.llego,
        ...(r.entrega.llego !== null ? { confirmed_at: hace(r.horas - 8) } : {}),
      });
      if (d.error) throw new Error(`deliveries: ${d.error.message}`);
    }
  }
  return { comunidades: filas.length, reportes: REPORTES_EJEMPLO.length, entregas: nEntrega, fotos: Object.keys(fotos).length };
}
