"use server";
import { prioridad, urgencia } from "@/contratos/prioridad";
import { ErrorAcceso, exigirAcceso } from "@/lib/acceso-panel";
import type { Rol } from "@/lib/sesion";
import { db } from "@/lib/supabase";
import { buscarYProcesar, procesarBoletin } from "@/lib/boletin";
import { aprobarAlerta, descartarAlerta, enviarAlerta, ErrorAlerta } from "@/lib/alertas";
import { ErrorEntrega, registrarEntrega } from "@/lib/entregas";
import { reiniciarDemo } from "@/lib/demo-datos";
import { enviarTarjetaProblema, ErrorProblema } from "@/lib/problemas";

/*
 * Acciones del panel (Server Actions). CADA una vuelve a validar la sesión y el rol (lib/acceso-panel.ts):
 * no se confía solo en proxy.ts. Roles: tecnico = aprobar, enviar, corregir y registrar;
 * admin = además Buscar/Subir boletín y Reiniciar demo. Sin SESSION_SECRET (basic auth) todos son admin.
 * Devuelven un mensaje para mostrar; nunca lanzan al cliente.
 */

export type Resultado = { ok: boolean; mensaje: string };

/** Valida sesión y rol, y ejecuta. El nombre del usuario queda en approved_by / updated_by / registered_by. */
async function ejecutar(fn: (u: string) => Promise<string>, rol: Rol = "tecnico"): Promise<Resultado> {
  try {
    const { usuario } = await exigirAcceso(rol);
    return { ok: true, mensaje: await fn(usuario) };
  } catch (e) {
    if (e instanceof ErrorAcceso || e instanceof ErrorAlerta || e instanceof ErrorEntrega || e instanceof ErrorProblema) {
      return { ok: false, mensaje: e.message };
    }
    console.error("panel", e);
    return { ok: false, mensaje: e instanceof Error ? e.message : String(e) };
  }
}

const describir = (r: Awaited<ReturnType<typeof buscarYProcesar>>): string => {
  switch (r.estado) {
    case "sin_novedad": return "No hay boletín nuevo: el más reciente ya fue procesado.";
    case "sin_alerta": return `Boletín procesado. No corresponde alertar: ${r.decision.motivo}`;
    case "alerta_creada": return `Alerta creada en borrador (${r.decision.motivo})${r.tarjetaLista ? "" : " — falta verificar la tarjeta para poder aprobarla"}.${r.tecnicaNotificada ? " Se avisó a la técnica." : ""}`;
    case "error": return `Error: ${r.error}`;
  }
};

export async function buscarBoletinAhora(): Promise<Resultado> {
  return ejecutar(async () => describir(await buscarYProcesar()), "admin");
}

export async function subirBoletin(form: FormData): Promise<Resultado> {
  return ejecutar(async () => {
    const f = form.get("pdf");
    if (!(f instanceof File) || f.size === 0) throw new Error("Elige un PDF");
    const pdf = new Uint8Array(await f.arrayBuffer());
    if (String.fromCharCode(...pdf.slice(0, 5)) !== "%PDF-") throw new Error("El archivo no es un PDF");
    return describir(await procesarBoletin({ pdf, sourceUrl: null, clave: `manual-${Date.now()}`, esEjemplo: form.get("ejemplo") === "1" }));
  }, "admin");
}

export async function aprobar(id: string): Promise<Resultado> {
  return ejecutar(async (u) => { await aprobarAlerta(id, u); return `Alerta aprobada por ${u}.`; });
}

export async function enviar(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    const r = await enviarAlerta(id);
    return `Enviada: ${r.enviados} entregados, ${r.fallidos} fallidos${r.omitidosWeb ? `, ${r.omitidosWeb} del simulador web (no reciben envíos)` : ""}.${r.errores[0] ? ` Primer error: ${r.errores[0].slice(0, 120)}` : ""}`;
  });
}

export async function descartar(id: string): Promise<Resultado> {
  return ejecutar(async () => { await descartarAlerta(id); return "Alerta descartada."; });
}

/** Confirma o descarta un reporte (los de "revisar" que dejó el bot por confianza baja, o cualquiera pendiente). */
export async function decidirReporte(id: string, accion: "confirmar" | "descartar"): Promise<Resultado> {
  return ejecutar(async (u) => {
    const { data: r, error } = await db().from("reports").select("id, status, payload, community_id, communities(families, animals)").eq("id", id).single();
    if (error) throw new Error(error.message);
    if (!["revisar", "por_confirmar", "confirmado"].includes(r.status as string)) throw new Error(`El reporte está en "${r.status}"`);
    if (accion === "descartar") {
      await db().from("reports").update({ status: "descartado", updated_by: u }).eq("id", id);
      return "Reporte descartado: ya no cuenta para la prioridad.";
    }
    const p = r.payload as Record<string, number | null>;
    const c = r.communities as unknown as { families: number; animals: number } | null;
    const res = prioridad({ diasSinRecurso: p.dias_sin_recurso ?? null, familias: p.familias_afectadas ?? c?.families ?? null, animales: p.animales_afectados ?? c?.animals ?? null, horasDesdeReporte: 0 });
    await db().from("reports").update({
      status: "confirmado", confirmed_at: new Date().toISOString(), updated_by: u,
      priority_score: res.score, priority_breakdown: { ...res, urgencia: urgencia(res.score) },
    }).eq("id", id);
    return `Reporte confirmado (prioridad ${res.score}).`;
  });
}

/** Corrige días, familias o animales de un reporte (vacío = "no lo dijeron"). */
export async function corregirReporte(id: string, form: FormData): Promise<Resultado> {
  return ejecutar(async (u) => {
    const num = (k: string) => { const v = String(form.get(k) ?? "").trim(); if (v === "") return null; const n = Number(v); if (!Number.isInteger(n) || n < 0) throw new Error(`"${k}" debe ser un número entero`); return n; };
    const { data: r, error } = await db().from("reports").select("payload, status, community_id, communities(families, animals)").eq("id", id).single();
    if (error) throw new Error(error.message);
    const payload = { ...(r.payload as Record<string, unknown>), dias_sin_recurso: num("dias"), familias_afectadas: num("familias"), animales_afectados: num("animales"), corregido_por: u };
    const c = r.communities as unknown as { families: number; animals: number } | null;
    const res = prioridad({ diasSinRecurso: payload.dias_sin_recurso, familias: payload.familias_afectadas ?? c?.families ?? null, animales: payload.animales_afectados ?? c?.animals ?? null, horasDesdeReporte: 0 });
    await db().from("reports").update({ payload, updated_by: u, ...(r.status === "confirmado" ? { priority_score: res.score, priority_breakdown: { ...res, urgencia: urgencia(res.score) } } : {}) }).eq("id", id);
    return "Datos corregidos.";
  });
}

export async function registrarEntregaPanel(form: FormData): Promise<Resultado> {
  return ejecutar(async (u) => {
    const foto = form.get("foto");
    const r = await registrarEntrega({
      communityId: String(form.get("communityId") ?? ""),
      reportId: (form.get("reportId") as string | null) || null,
      kind: String(form.get("kind")) as "cisterna" | "forraje",
      quantity: Number(form.get("quantity")),
      foto: foto instanceof File && foto.size > 0 ? { bytes: new Uint8Array(await foto.arrayBuffer()), mime: foto.type } : null,
    }, u);
    return `Entrega registrada. Se preguntó "¿Llegó?" a ${r.notificados} ${r.notificados === 1 ? "persona" : "personas"}.`;
  });
}

/** Envía la tarjeta "durante" de un problema a todas las comunidades que lo reportan (sin repetir en 24 h). */
export async function enviarProblema(factor: string): Promise<Resultado> {
  return ejecutar(async (u) => {
    const r = await enviarTarjetaProblema(factor, u);
    const personas = `${r.enviados} ${r.enviados === 1 ? "persona" : "personas"}`;
    return `«${r.tarjeta.titulo}» enviada a ${personas} de ${r.comunidades} ${r.comunidades === 1 ? "comunidad" : "comunidades"}`
      + `${r.fallidos ? `, ${r.fallidos} fallidos` : ""}${r.omitidosWeb ? `, ${r.omitidosWeb} del simulador web (no reciben envíos)` : ""}.`
      + `${r.errores[0] ? ` Primer error: ${r.errores[0].slice(0, 120)}` : ""}`;
  });
}

export async function reiniciar(): Promise<Resultado> {
  return ejecutar(async () => {
    const r = await reiniciarDemo(db());
    return `Demo reiniciado: ${r.comunidades} comunidades, ${r.reportes} reportes y ${r.entregas} entregas de ejemplo. Los suscriptores se conservan.`;
  }, "admin");
}
