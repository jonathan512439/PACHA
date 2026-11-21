import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validarFoto, type TipoFoto } from "@/lib/storage/foto";

const CENTRO_TOLEDO = { lat: -18.1812759, lon: -67.4061409 };
const MUNICIPIO = "Toledo";
const ESTACION = "oruro-ciudad";
const FOTOS_DIR = path.join(process.cwd(), "public", "demo", "entregas");
const EXTENSIONES = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const COMUNIDADES_DEMO = [
  { id: "00000000-0000-4000-8000-00000000c001", name: "Kantuta Pampa (EJEMPLO)", dx: -0.018, dy: -0.021, families: 42, animals: 860, main_activity: "camelidos" },
  { id: "00000000-0000-4000-8000-00000000c002", name: "Villa Ejemplo", dx: -0.006, dy: 0.012, families: 68, animals: 420, main_activity: "mixto" },
  { id: "00000000-0000-4000-8000-00000000c003", name: "Pampa Norte (EJEMPLO)", dx: 0.014, dy: -0.032, families: 35, animals: 730, main_activity: "camelidos" },
  { id: "00000000-0000-4000-8000-00000000c004", name: "Pampa Sur (EJEMPLO)", dx: -0.032, dy: 0.025, families: 58, animals: 510, main_activity: "papa_quinua" },
  { id: "00000000-0000-4000-8000-00000000c005", name: "Jach'a Pampa (EJEMPLO)", dx: 0.027, dy: 0.019, families: 76, animals: 1240, main_activity: "camelidos" },
  { id: "00000000-0000-4000-8000-00000000c006", name: "Comunidad Mixta (EJEMPLO)", dx: 0.006, dy: 0.041, families: 93, animals: 980, main_activity: "mixto" },
  { id: "00000000-0000-4000-8000-00000000c007", name: "Altiplano Centro (EJEMPLO)", dx: -0.041, dy: -0.006, families: 51, animals: 1460, main_activity: "camelidos" },
  { id: "00000000-0000-4000-8000-00000000c008", name: "Río Seco (EJEMPLO)", dx: 0.038, dy: -0.014, families: 29, animals: 330, main_activity: "papa_quinua" },
  { id: "00000000-0000-4000-8000-00000000c009", name: "Comunidad de prueba (EJEMPLO)", dx: 0.001, dy: 0.002, families: 50, animals: 700, main_activity: "mixto", is_test: true },
] as const;

const ENTREGAS_DEMO = [
  { id: "00000000-0000-4000-8000-00000000d001", communityId: COMUNIDADES_DEMO[0].id, photo: "entrega-01" as const, kind: "cisterna", quantity: 1, unit: "cisternas" },
  { id: "00000000-0000-4000-8000-00000000d002", communityId: COMUNIDADES_DEMO[1].id, photo: "entrega-02" as const, kind: "forraje", quantity: 120, unit: "kg" },
  { id: "00000000-0000-4000-8000-00000000d003", communityId: COMUNIDADES_DEMO[2].id, photo: "entrega-03" as const, kind: "cisterna", quantity: 1, unit: "cisternas" },
] as const;

type FotoLista = { nombre: string; bytes: Buffer; mime: TipoFoto };

export async function prepararFotosDemo(): Promise<Map<string, FotoLista>> {
  let nombres: string[];
  try {
    nombres = await readdir(FOTOS_DIR);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Faltan las tres fotos de ejemplo de C en ${FOTOS_DIR}.`);
    }
    throw error;
  }

  const resultado = new Map<string, FotoLista>();
  for (const entrega of ENTREGAS_DEMO) {
    const coincidencias = nombres.filter((nombre) => {
      const ext = path.extname(nombre).toLowerCase();
      return path.basename(nombre, ext) === entrega.photo && EXTENSIONES.has(ext);
    });
    if (coincidencias.length !== 1) {
      throw new Error(`Se esperaba un solo archivo ${entrega.photo}.{jpg,png,webp} en ${FOTOS_DIR}.`);
    }
    const nombre = coincidencias[0];
    const bytes = await readFile(path.join(FOTOS_DIR, nombre));
    const mime = validarFoto(bytes, nombre);
    resultado.set(entrega.photo, { nombre, bytes, mime });
  }
  return resultado;
}

export async function seedDemo(
  supabase: SupabaseClient,
  fotos?: Map<string, FotoLista>,
) {
  const fotosPreparadas = fotos ?? await prepararFotosDemo();
  const comunidades = COMUNIDADES_DEMO.map((comunidad) => ({
    id: comunidad.id,
    name: comunidad.name,
    municipio: MUNICIPIO,
    lat: CENTRO_TOLEDO.lat + comunidad.dx,
    lon: CENTRO_TOLEDO.lon + comunidad.dy,
    families: comunidad.families,
    animals: comunidad.animals,
    main_activity: comunidad.main_activity,
    station_id: ESTACION,
    is_example: true,
    is_test: "is_test" in comunidad ? comunidad.is_test : false,
  }));
  const { error: errorComunidades } = await supabase.from("communities").upsert(comunidades, { onConflict: "id" });
  if (errorComunidades) throw new Error(`No se pudieron cargar las comunidades de ejemplo: ${errorComunidades.message}`);

  const filasEntregas = [];
  for (const entrega of ENTREGAS_DEMO) {
    const foto = fotosPreparadas.get(entrega.photo);
    if (!foto) throw new Error(`No se preparó la foto ${entrega.photo}.`);
    const storagePath = `demo/${entrega.photo}${path.extname(foto.nombre).toLowerCase()}`;
    const { error: errorFoto } = await supabase.storage
      .from("entregas")
      .upload(storagePath, foto.bytes, { contentType: foto.mime, upsert: true });
    if (errorFoto) throw new Error(`No se pudo subir ${foto.nombre}: ${errorFoto.message}`);
    filasEntregas.push({
      id: entrega.id,
      report_id: null,
      community_id: entrega.communityId,
      kind: entrega.kind,
      quantity: entrega.quantity,
      unit: entrega.unit,
      photo_path: storagePath,
      is_example: true,
      registered_by: "seed-demo",
      delivered_at: new Date().toISOString(),
      confirmed_by_community: null,
      confirmed_at: null,
    });
  }

  const { error: errorEntregas } = await supabase.from("deliveries").upsert(filasEntregas, { onConflict: "id" });
  if (errorEntregas) throw new Error(`No se pudieron cargar las entregas de ejemplo: ${errorEntregas.message}`);
  return { comunidades: comunidades.length, entregas: filasEntregas.length };
}
