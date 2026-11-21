import { leerDatosPublicos } from "@/lib/datos-publicos";

export async function GET() {
  try {
    const datos = await leerDatosPublicos();
    return Response.json(datos, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("publico/mapa", error);
    return Response.json({ error: "No se pudieron actualizar los datos públicos." }, { status: 500 });
  }
}
