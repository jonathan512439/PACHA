import "server-only";
import { z } from "zod";
import { prioridadComunidad, type ReporteParaPrioridad } from "@/contratos/prioridad";
import { db } from "@/lib/supabase";
import { DatosMapaPublico } from "@/lib/tipos-publicos";

const filaComunidad = z.object({
  id: z.string().uuid(),
  name: z.string(),
  municipio: z.string(),
  lat: z.number(),
  lon: z.number(),
  families: z.number().int().nonnegative(),
  animals: z.number().int().nonnegative(),
  is_example: z.boolean(),
  is_test: z.boolean(),
});

const filaReporte = z.object({
  id: z.string().uuid(),
  community_id: z.string().uuid(),
  status: z.literal("confirmado"),
  confirmed_at: z.string().nullable(),
  created_at: z.string(),
  payload: z
    .object({
      dias_sin_recurso: z.number().nullable().optional(),
      familias_afectadas: z.number().nullable().optional(),
      animales_afectados: z.number().nullable().optional(),
    })
    .passthrough(),
});

const filaAlerta = z.object({
  id: z.string().uuid(),
  bulletin_id: z.string().uuid(),
  zona: z.string().nullable(),
  hazard: z.enum(["helada", "sequia", "nevada"]),
  risk_level: z.enum(["bajo", "medio", "alto"]).nullable(),
  cita_evento: z.string(),
  valid_from: z.string(),
  valid_to: z.string(),
  sent_at: z.string(),
});

const filaBoletin = z.object({
  source_url: z.string().url().nullable(),
  is_example: z.boolean(),
});

function fecha(valor: string, campo: string) {
  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Fecha inválida en ${campo}.`);
  return parsed;
}

export async function leerDatosPublicos() {
  const supabase = db();
  const { data: comunidadesCrudas, error: errorComunidades } = await supabase
    .from("communities")
    .select("id, name, municipio, lat, lon, families, animals, is_example, is_test")
    .order("name");
  if (errorComunidades) throw new Error(`No se pudieron leer las comunidades: ${errorComunidades.message}`);
  const comunidades = z.array(filaComunidad).parse(comunidadesCrudas ?? []);

  const porComunidad = new Map<string, ReporteParaPrioridad[]>();
  if (comunidades.length) {
    const { data: reportesCrudos, error: errorReportes } = await supabase
      .from("reports")
      .select("id, community_id, status, confirmed_at, created_at, payload")
      .eq("status", "confirmado")
      .in("community_id", comunidades.map((comunidad) => comunidad.id));
    if (errorReportes) throw new Error(`No se pudieron leer los reportes confirmados: ${errorReportes.message}`);

    for (const crudo of z.array(filaReporte).parse(reportesCrudos ?? [])) {
      const lista = porComunidad.get(crudo.community_id) ?? [];
      lista.push({
        id: crudo.id,
        status: crudo.status,
        confirmedAt: crudo.confirmed_at ? fecha(crudo.confirmed_at, "confirmed_at") : null,
        createdAt: fecha(crudo.created_at, "created_at"),
        diasSinRecurso: crudo.payload.dias_sin_recurso ?? null,
        familias: crudo.payload.familias_afectadas ?? null,
        animales: crudo.payload.animales_afectados ?? null,
      });
      porComunidad.set(crudo.community_id, lista);
    }
  }

  const ahora = new Date();
  const comunidadesPublicas = comunidades.map((comunidad) => ({
    id: comunidad.id,
    nombre: comunidad.name,
    municipio: comunidad.municipio,
    lat: comunidad.lat,
    lon: comunidad.lon,
    families: comunidad.families,
    animals: comunidad.animals,
    isExample: comunidad.is_example,
    isTest: comunidad.is_test,
    prioridad: prioridadComunidad(
      porComunidad.get(comunidad.id) ?? [],
      { families: comunidad.families, animals: comunidad.animals },
      ahora,
    ),
  }));

  const { data: alertaCruda, error: errorAlerta } = await supabase
    .from("alerts")
    .select("id, bulletin_id, zona, hazard, risk_level, cita_evento, valid_from, valid_to, sent_at")
    .eq("status", "enviada")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errorAlerta) throw new Error(`No se pudo leer la alerta enviada: ${errorAlerta.message}`);

  let alerta = null;
  if (alertaCruda) {
    const dato = filaAlerta.parse(alertaCruda);
    const { data: boletinCrudo, error: errorBoletin } = await supabase
      .from("bulletins")
      .select("source_url, is_example")
      .eq("id", dato.bulletin_id)
      .maybeSingle();
    if (errorBoletin) throw new Error(`No se pudo leer la fuente de la alerta: ${errorBoletin.message}`);
    if (!boletinCrudo) throw new Error(`El boletín de la alerta ${dato.id} no existe.`);
    const boletin = filaBoletin.parse(boletinCrudo);
    alerta = {
      id: dato.id,
      zona: dato.zona,
      amenaza: dato.hazard,
      riesgo: dato.risk_level,
      citaEvento: dato.cita_evento,
      fechaInicio: dato.valid_from,
      fechaFin: dato.valid_to,
      enviada: dato.sent_at,
      fuenteUrl: boletin.source_url,
      boletinEjemplo: boletin.is_example,
    };
  }

  return DatosMapaPublico.parse({
    actualizado: ahora.toISOString(),
    comunidades: comunidadesPublicas,
    alerta,
  });
}
