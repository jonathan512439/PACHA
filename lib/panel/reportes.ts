import "server-only";
import { z } from "zod";
import { db } from "@/lib/supabase";

const filaReporte = z.object({
  id: z.string().uuid(),
  community_id: z.string().uuid(),
  type: z.enum(["agua", "dano", "forraje", "otro"]),
  status: z.enum(["por_confirmar", "confirmado", "atendido", "revisar", "descartado"]),
  payload: z.record(z.string(), z.unknown()),
  transcript: z.string().nullable(),
  media_path: z.string().nullable(),
  priority_score: z.number().nullable(),
  created_at: z.string(),
  attended_at: z.string().nullable(),
});

const datosReporte = z.object({
  dias_sin_recurso: z.number().nullable().optional(),
  familias_afectadas: z.number().nullable().optional(),
  animales_afectados: z.number().nullable().optional(),
});

const filaComunidad = z.object({
  id: z.string().uuid(),
  name: z.string(),
  is_example: z.boolean(),
});

export async function listarReportesPanel() {
  const supabase = db();
  const { data: reportesCrudos, error: errorReportes } = await supabase
    .from("reports")
    .select("id, community_id, type, status, payload, transcript, media_path, priority_score, created_at, attended_at")
    .in("status", ["por_confirmar", "confirmado", "atendido", "revisar", "descartado"])
    .order("created_at", { ascending: false })
    .limit(250);
  if (errorReportes) throw new Error(`No se pudieron leer los reportes: ${errorReportes.message}`);
  const reportes = z.array(filaReporte).parse(reportesCrudos ?? []);

  const ids = [...new Set(reportes.map((reporte) => reporte.community_id))];
  const comunidades = ids.length
    ? await supabase.from("communities").select("id, name, is_example").in("id", ids)
    : { data: [], error: null };
  if (comunidades.error) throw new Error(`No se pudieron leer las comunidades de los reportes: ${comunidades.error.message}`);
  const porId = new Map(
    z.array(filaComunidad).parse(comunidades.data ?? []).map((comunidad) => [comunidad.id, comunidad]),
  );

  return Promise.all(
    reportes.map(async (reporte) => {
      const comunidad = porId.get(reporte.community_id);
      if (!comunidad) throw new Error(`No existe la comunidad del reporte ${reporte.id}.`);
      const payload = datosReporte.parse(reporte.payload);
      let audioUrl: string | null = null;
      if (reporte.media_path) {
        const { data, error } = await supabase.storage
          .from("reportes")
          .createSignedUrl(reporte.media_path, 600);
        if (error || !data?.signedUrl) {
          throw new Error(`No se pudo firmar el audio privado del reporte ${reporte.id}: ${error?.message ?? "URL no disponible"}`);
        }
        audioUrl = data.signedUrl;
      }

      return {
        id: reporte.id,
        comunidad: comunidad.name,
        comunidadEjemplo: comunidad.is_example,
        tipo: reporte.type,
        estado: reporte.status,
        transcripcion: reporte.transcript,
        audioUrl,
        puntaje: reporte.priority_score,
        fecha: reporte.created_at,
        atendido: reporte.attended_at,
        diasSinRecurso: payload.dias_sin_recurso ?? null,
        familias: payload.familias_afectadas ?? null,
        animales: payload.animales_afectados ?? null,
      };
    }),
  );
}
