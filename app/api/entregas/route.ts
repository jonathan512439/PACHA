import { ErrorEntrega, registrarEntrega } from "@/lib/entregas";
import { noAutorizado, usuarioPanel } from "@/lib/panel-auth";

// POST /api/entregas — registra una entrega desde el panel (multipart):
//   communityId (obligatorio), reportId (opcional), kind = cisterna|forraje, quantity, foto (opcional, JPG/PNG/WEBP ≤ 5 MB, SIN EXIF)
// Marca el reporte como atendido y el bot pregunta "¿Llegó?" a la comunidad.
export const maxDuration = 60;

export async function POST(request: Request) {
  const usuario = usuarioPanel(request.headers.get("authorization"));
  if (!usuario) return noAutorizado();
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Se espera multipart/form-data" }, { status: 400 });
  const foto = form.get("foto");
  try {
    const r = await registrarEntrega({
      communityId: String(form.get("communityId") ?? ""),
      reportId: (form.get("reportId") as string | null) || null,
      kind: String(form.get("kind")) as "cisterna" | "forraje",
      quantity: Number(form.get("quantity")),
      foto: foto instanceof File && foto.size > 0 ? { bytes: new Uint8Array(await foto.arrayBuffer()), mime: foto.type } : null,
    }, usuario);
    return Response.json(r);
  } catch (e) {
    if (e instanceof ErrorEntrega) return Response.json({ error: e.message }, { status: e.status });
    console.error("entregas", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
