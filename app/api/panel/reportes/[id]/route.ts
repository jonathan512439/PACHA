import { z } from "zod";
import { prioridad, urgencia } from "@/contratos/prioridad";
import { db } from "@/lib/supabase";

const CambiosReporte = z
  .object({
    dias_sin_recurso: z.number().int().min(0).max(60).nullable().optional(),
    familias_afectadas: z.number().int().min(0).nullable().optional(),
    animales_afectados: z.number().int().min(0).nullable().optional(),
    accion: z.enum(["confirmar", "descartar"]).optional(),
  })
  .strict()
  .refine(
    (cambios) =>
      cambios.accion !== undefined ||
      cambios.dias_sin_recurso !== undefined ||
      cambios.familias_afectadas !== undefined ||
      cambios.animales_afectados !== undefined,
    "Indica al menos un cambio.",
  );

const ReporteActual = z.object({
  id: z.string().uuid(),
  community_id: z.string().uuid(),
  status: z.enum(["por_confirmar", "confirmado", "atendido", "revisar", "descartado"]),
  payload: z.record(z.string(), z.unknown()),
});

const Comunidad = z.object({
  families: z.number().int().nonnegative(),
  animals: z.number().int().nonnegative(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = request.headers.get("x-panel-user");
  if (!usuario) return Response.json({ error: "Autenticación requerida." }, { status: 401 });

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "Identificador de reporte inválido." }, { status: 400 });
  }
  const cambios = CambiosReporte.safeParse(await request.json().catch(() => null));
  if (!cambios.success) return Response.json({ error: "Cambios inválidos." }, { status: 400 });

  try {
    const supabase = db();
    const { data: actualCrudo, error: errorLectura } = await supabase
      .from("reports")
      .select("id, community_id, status, payload")
      .eq("id", id)
      .maybeSingle();
    if (errorLectura) throw new Error(`No se pudo leer el reporte: ${errorLectura.message}`);
    if (!actualCrudo) return Response.json({ error: "El reporte no existe." }, { status: 404 });
    const actual = ReporteActual.parse(actualCrudo);
    if (cambios.data.accion && actual.status !== "revisar") {
      return Response.json({ error: "Solo se pueden confirmar o descartar reportes en revisión." }, { status: 409 });
    }

    const payload = { ...actual.payload };
    for (const campo of ["dias_sin_recurso", "familias_afectadas", "animales_afectados"] as const) {
      if (cambios.data[campo] !== undefined) payload[campo] = cambios.data[campo];
    }
    const actualizacion: Record<string, unknown> = {
      payload,
      updated_by: usuario,
    };

    if (cambios.data.accion === "descartar") {
      actualizacion.status = "descartado";
    } else if (cambios.data.accion === "confirmar") {
      const { data: comunidadCruda, error: errorComunidad } = await supabase
        .from("communities")
        .select("families, animals")
        .eq("id", actual.community_id)
        .single();
      if (errorComunidad) throw new Error(`No se pudo leer la comunidad: ${errorComunidad.message}`);
      const comunidad = Comunidad.parse(comunidadCruda);
      const prioridadReporte = prioridad({
        diasSinRecurso: typeof payload.dias_sin_recurso === "number" ? payload.dias_sin_recurso : null,
        familias: typeof payload.familias_afectadas === "number" ? payload.familias_afectadas : comunidad.families,
        animales: typeof payload.animales_afectados === "number" ? payload.animales_afectados : comunidad.animals,
        horasDesdeReporte: 0,
      });
      actualizacion.status = "confirmado";
      actualizacion.confirmed_at = new Date().toISOString();
      actualizacion.priority_score = prioridadReporte.score;
      actualizacion.priority_breakdown = { ...prioridadReporte, urgencia: urgencia(prioridadReporte.score) };
    }

    let update = supabase.from("reports").update(actualizacion).eq("id", id);
    if (cambios.data.accion) update = update.eq("status", "revisar");
    const { data: actualizado, error: errorActualizacion } = await update
      .select("id, status, payload, priority_score")
      .maybeSingle();
    if (errorActualizacion) throw new Error(`No se pudo actualizar el reporte: ${errorActualizacion.message}`);
    if (!actualizado) return Response.json({ error: "El reporte cambió mientras se actualizaba." }, { status: 409 });
    return Response.json(actualizado);
  } catch (error) {
    console.error("panel/reportes", error);
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el reporte." }, { status: 500 });
  }
}
