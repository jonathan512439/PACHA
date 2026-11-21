import { db } from "@/lib/supabase";
import { prepararFotosDemo, seedDemo } from "@/lib/demo/seed";

export async function POST(request: Request) {
  const usuario = request.headers.get("x-panel-user");
  if (!usuario) return Response.json({ error: "Autenticación requerida." }, { status: 401 });

  try {
    const supabase = db();
    const fotos = await prepararFotosDemo();

    const { data: reportes, error: errorLectura } = await supabase
      .from("reports")
      .select("media_path")
      .not("media_path", "is", null);
    if (errorLectura) throw new Error(`No se pudieron preparar los reportes para reinicio: ${errorLectura.message}`);

    const rutasPrivadas = (reportes ?? [])
      .map((reporte) => reporte.media_path)
      .filter((ruta): ruta is string => typeof ruta === "string" && ruta.length > 0);
    if (rutasPrivadas.length) {
      const { error } = await supabase.storage.from("reportes").remove(rutasPrivadas);
      if (error) throw new Error(`No se pudieron borrar los audios privados de reportes: ${error.message}`);
    }

    const limpiar = async (tabla: string, operation: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await operation;
      if (error) throw new Error(`No se pudo limpiar ${tabla}: ${error.message}`);
    };
    await limpiar("deliveries no EJEMPLO", supabase.from("deliveries").delete().eq("is_example", false));
    await limpiar("reports", supabase.from("reports").delete().not("id", "is", null));
    await limpiar("alert_deliveries", supabase.from("alert_deliveries").delete().not("id", "is", null));
    await limpiar("alerts", supabase.from("alerts").delete().not("id", "is", null));
    await limpiar("bulletins", supabase.from("bulletins").delete().not("id", "is", null));

    const resultado = await seedDemo(supabase, fotos);
    return Response.json({ ok: true, usuario, ...resultado });
  } catch (error) {
    console.error("demo/reiniciar", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo reiniciar la demo." },
      { status: 500 },
    );
  }
}
