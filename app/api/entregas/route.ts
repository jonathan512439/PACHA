import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { MAX_FOTO_BYTES, validarFoto } from "@/lib/storage/foto";

const EntradaEntrega = z.object({
  reportId: z.string().uuid(),
  kind: z.enum(["cisterna", "forraje"]),
  quantity: z.coerce.number().positive(),
  unit: z.enum(["cisternas", "kg"]),
});

const Reporte = z.object({
  id: z.string().uuid(),
  community_id: z.string().uuid(),
  status: z.string(),
});

const MapaExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

async function limpiarEntrega(
  supabase: ReturnType<typeof db>,
  entregaId: string,
  photoPath: string,
) {
  const { error: errorFila } = await supabase.from("deliveries").delete().eq("id", entregaId);
  const { error: errorFoto } = await supabase.storage.from("entregas").remove([photoPath]);
  if (errorFila || errorFoto) {
    throw new Error(
      `No se pudo revertir la entrega (fila: ${errorFila?.message ?? "ok"}; foto: ${errorFoto?.message ?? "ok"}).`,
    );
  }
}

export async function POST(request: Request) {
  const usuario = request.headers.get("x-panel-user");
  if (!usuario) return Response.json({ error: "Autenticación requerida." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Formulario de entrega inválido." }, { status: 400 });
  }
  const entrada = EntradaEntrega.safeParse({
    reportId: form.get("reportId"),
    kind: form.get("kind"),
    quantity: form.get("quantity"),
    unit: form.get("unit"),
  });
  const foto = form.get("photo");
  if (!entrada.success || !(foto instanceof File)) {
    return Response.json({ error: "Completa tipo, cantidad, unidad y una foto válida." }, { status: 400 });
  }
  if (
    (entrada.data.kind === "cisterna" && entrada.data.unit !== "cisternas") ||
    (entrada.data.kind === "forraje" && entrada.data.unit !== "kg")
  ) {
    return Response.json({ error: "La unidad no corresponde al tipo de entrega." }, { status: 400 });
  }
  if (foto.size === 0 || foto.size > MAX_FOTO_BYTES) {
    return Response.json({ error: "La foto está vacía o supera el límite de 5 MB." }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await foto.arrayBuffer());
  } catch (error) {
    console.error("entregas/leer-foto", error);
    return Response.json({ error: "No se pudo leer la foto subida." }, { status: 500 });
  }
  let mime: ReturnType<typeof validarFoto>;
  try {
    mime = validarFoto(bytes, foto.name || "foto");
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "La foto no es válida." },
      { status: 400 },
    );
  }

  try {
    const supabase = db();
    const { data: reporteCrudo, error: errorReporte } = await supabase
      .from("reports")
      .select("id, community_id, status")
      .eq("id", entrada.data.reportId)
      .maybeSingle();
    if (errorReporte) throw new Error(`No se pudo leer el reporte: ${errorReporte.message}`);
    if (!reporteCrudo) return Response.json({ error: "El reporte no existe." }, { status: 404 });
    const reporte = Reporte.parse(reporteCrudo);
    if (reporte.status !== "confirmado") {
      return Response.json({ error: "Solo se puede registrar una entrega para un reporte confirmado." }, { status: 409 });
    }

    const entregaId = randomUUID();
    const photoPath = `demo/${reporte.community_id}/${entregaId}.${MapaExtension[mime]}`;
    const { error: errorSubida } = await supabase.storage
      .from("entregas")
      .upload(photoPath, bytes, { contentType: mime, upsert: false });
    if (errorSubida) throw new Error(`No se pudo subir la foto: ${errorSubida.message}`);

    const { error: errorInsercion } = await supabase.from("deliveries").insert({
      id: entregaId,
      report_id: reporte.id,
      community_id: reporte.community_id,
      kind: entrada.data.kind,
      quantity: entrada.data.quantity,
      unit: entrada.data.unit,
      photo_path: photoPath,
      is_example: false,
      registered_by: usuario,
    });
    if (errorInsercion) {
      const { error: errorLimpieza } = await supabase.storage.from("entregas").remove([photoPath]);
      if (errorLimpieza) {
        throw new Error(
          `No se pudo registrar la entrega (${errorInsercion.message}) ni limpiar la foto (${errorLimpieza.message}).`,
        );
      }
      throw new Error(`No se pudo registrar la entrega: ${errorInsercion.message}`);
    }

    const { data: reporteActualizado, error: errorActualizacion } = await supabase
      .from("reports")
      .update({ status: "atendido", attended_at: new Date().toISOString(), updated_by: usuario })
      .eq("id", reporte.id)
      .eq("status", "confirmado")
      .select("id")
      .maybeSingle();
    if (errorActualizacion || !reporteActualizado) {
      await limpiarEntrega(supabase, entregaId, photoPath);
      if (errorActualizacion) throw new Error(`No se pudo marcar el reporte como atendido: ${errorActualizacion.message}`);
      return Response.json({ error: "El reporte cambió mientras se registraba la entrega." }, { status: 409 });
    }

    // TODO: integrar con el adaptador de A cuando esté disponible.
    // await notificarEntrega(entregaId);
    return Response.json({ id: entregaId, reportId: reporte.id, estadoReporte: "atendido" }, { status: 201 });
  } catch (error) {
    console.error("entregas/registrar", error);
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo registrar la entrega." }, { status: 500 });
  }
}
