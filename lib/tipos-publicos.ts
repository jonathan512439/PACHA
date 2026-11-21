import { z } from "zod";

const desglosePrioridad = z.object({
  criterio: z.string(),
  aporte: z.number(),
  nota: z.string().optional(),
});

const prioridadPublica = z.discriminatedUnion("estado", [
  z.object({ estado: z.literal("sin_reportes") }),
  z.object({
    estado: z.literal("activa"),
    reporteId: z.string(),
    urgencia: z.enum(["rojo", "naranja", "amarillo", "verde"]),
    resultado: z.object({
      score: z.number(),
      desglose: z.array(desglosePrioridad),
      datosEstimados: z.array(z.string()),
    }),
  }),
]);

export const DatosMapaPublico = z.object({
  actualizado: z.string(),
  comunidades: z.array(
    z.object({
      id: z.string().uuid(),
      nombre: z.string(),
      municipio: z.string(),
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      families: z.number().int().nonnegative(),
      animals: z.number().int().nonnegative(),
      isExample: z.boolean(),
      isTest: z.boolean(),
      prioridad: prioridadPublica,
    }),
  ),
  alerta: z
    .object({
      id: z.string().uuid(),
      zona: z.string().nullable(),
      amenaza: z.enum(["helada", "sequia", "nevada"]),
      riesgo: z.enum(["bajo", "medio", "alto"]).nullable(),
      citaEvento: z.string(),
      fechaInicio: z.string(),
      fechaFin: z.string(),
      enviada: z.string(),
      fuenteUrl: z.string().url().nullable(),
      boletinEjemplo: z.boolean(),
    })
    .nullable(),
});

export type DatosMapaPublico = z.infer<typeof DatosMapaPublico>;
export type ComunidadMapaPublico = DatosMapaPublico["comunidades"][number];
