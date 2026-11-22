import { procesarBoletin } from "@/lib/boletin";
import { exigirAccesoApi } from "@/lib/panel-auth";

// Respaldo manual: el panel sube el PDF del boletín (multipart, campo "pdf"; opcional "ejemplo" = "1").
// Mismo proceso que la búsqueda automática. Vercel limita el cuerpo a 4,5 MB (el boletín pesa ~1,1 MB).
export const maxDuration = 60;

export async function POST(request: Request) {
  const acceso = exigirAccesoApi(request, "admin");
  if (acceso instanceof Response) return acceso;
  const form = await request.formData().catch(() => null);
  const archivo = form?.get("pdf");
  if (!(archivo instanceof File)) return Response.json({ error: 'Falta el archivo en el campo "pdf"' }, { status: 400 });
  const pdf = new Uint8Array(await archivo.arrayBuffer());
  if (String.fromCharCode(...pdf.slice(0, 5)) !== "%PDF-") return Response.json({ error: "El archivo no es un PDF" }, { status: 400 });
  try {
    const r = await procesarBoletin({ pdf, sourceUrl: null, clave: `manual-${Date.now()}`, esEjemplo: form?.get("ejemplo") === "1" });
    return Response.json(r, { status: r.estado === "error" ? 502 : 200 });
  } catch (e) {
    console.error("boletin/subir", e);
    return Response.json({ estado: "error", error: String(e) }, { status: 502 });
  }
}
