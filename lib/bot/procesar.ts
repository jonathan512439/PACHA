import "server-only";
import { z } from "zod";
import {
  EntradaBot,
  LIMITES,
  MENSAJES,
  MENU,
  SalidaBot,
  UMBRAL_CONFIANZA_REPORTE,
  type MensajeEntrante,
  type OpcionMenu,
} from "@/contratos/tipos";
import { prioridad, urgencia } from "@/contratos/prioridad";
import { interpretarMensaje, GeminiNoDisponible } from "@/lib/gemini";
import { tarjetasEnviables, salidaTarjeta } from "@/lib/tarjetas";
import * as D from "@/lib/bot/datos";
import * as T from "@/lib/bot/textos";

/*
 * procesarMensaje: el bot completo, igual para web, Telegram y WhatsApp.
 * Recibe un EntradaBot ya normalizado por el adaptador del canal y devuelve SalidaBot[] para que
 * el adaptador lo traduzca. El bot NUNCA redacta consejos: envía tarjetas ya escritas (verificadas)
 * o textos fijos. Gemini solo interpreta el mensaje (lib/gemini.ts).
 *
 * Ids de botón (≤ 64 caracteres, límite de Telegram):
 *   optin:si | optin:no | com:<uuid>
 *   menu:<agua|animales|cultivos> | menu:<op>:<antes|ahora>
 *   rep_si:<uuid> | rep_no:<uuid> | rep_com:mia | rep_com:<uuid>
 *   ent_si:<uuid> | ent_no:<uuid>
 */

type Salida = SalidaBot;
const texto = (t: string): Salida => ({ tipo: "texto", texto: t });
const Salidas = z.array(SalidaBot);
const MEDICINAS = /vacun|medic|dosis|remedio|antibi|inyecc|desparasit|tratamiento/i;

export async function procesarMensaje(entradaSinValidar: EntradaBot): Promise<Salida[]> {
  const e = EntradaBot.parse(entradaSinValidar);
  // 1. Deduplicar: WhatsApp y Telegram reintentan si tardamos en responder.
  if (!(await D.registrarEntrante(e.canal, e.mensajeId))) return [];

  const { s } = await D.obtenerOCrearSuscriptor(e.canal, e.usuarioId);
  const ctx: D.Contexto = { ...(s.contexto ?? {}) };
  const salidas = await enrutar(e, s, ctx);
  await D.actualizarSuscriptor(s.id, { contexto: ctx, ...(salidas.cambios ?? {}) });
  return Salidas.parse(salidas.respuestas); // nunca sale nada fuera del contrato (p. ej. un botón de 21 caracteres)
}

type Resultado = { respuestas: Salida[]; cambios?: Partial<Omit<D.Suscriptor, "id" | "contexto">> };

async function enrutar(e: EntradaBot, s: D.Suscriptor, ctx: D.Contexto): Promise<Resultado> {
  const t = e.texto ? T.normalizar(e.texto) : "";

  // BAJA funciona en cualquier momento.
  if (t === "baja") return { respuestas: [texto(MENSAJES.baja)], cambios: { activo: false, estado: "baja" } };

  // ---- Registro --------------------------------------------------------
  if (s.estado === "nuevo" || s.estado === "rechazado") return preguntarOptin();
  if (s.estado === "baja") {
    if (t === "alerta") return s.community_id
      ? { respuestas: [texto(T.REACTIVADO)], cambios: { activo: true, estado: "listo" } }
      : { ...(await listaComunidades()), cambios: { activo: true, estado: "esperando_comunidad" } };
    return { respuestas: [texto(MENSAJES.baja)] };
  }
  if (s.estado === "esperando_optin") {
    if (e.botonId === "optin:si") return { ...(await listaComunidades()), cambios: { estado: "esperando_comunidad" } };
    if (e.botonId === "optin:no") return { respuestas: [texto(T.RECHAZO)], cambios: { estado: "rechazado", activo: false } };
    return preguntarOptin();
  }
  if (s.estado === "esperando_comunidad" || !s.community_id) {
    const elegida = await elegirComunidad(e);
    if (!elegida) return { ...(await listaComunidades()), cambios: { estado: "esperando_comunidad" } };
    return { respuestas: [texto(T.registrado(elegida.name))], cambios: { community_id: elegida.id, estado: "listo", activo: true } };
  }

  // ---- Registrado ------------------------------------------------------
  if (e.botonId) return manejarBoton(e.botonId, s, ctx);
  if (t === "0" || t === "menu" || t === "alerta") return { respuestas: [menuTemas()] };
  if (e.tipo === "texto" && !e.texto?.trim()) return { respuestas: [menuTemas()] };
  return mensajeLibre(e, s, ctx);
}

/* ---------------------------------------------------------------------- */
const preguntarOptin = (): Resultado => ({
  respuestas: [
    ...audioBienvenida(),
    { tipo: "botones", texto: T.BIENVENIDA, botones: [{ id: "optin:si", titulo: "✅ Sí, quiero avisos" }, { id: "optin:no", titulo: "No, gracias" }] },
  ],
  cambios: { estado: "esperando_optin" },
});

/** Audio de bienvenida pregenerado (bucket 'audios'). Se activa con AUDIO_BIENVENIDA=1 cuando C lo suba. */
function audioBienvenida(): Salida[] {
  if (process.env.AUDIO_BIENVENIDA !== "1") return [];
  return [{ tipo: "audio", oggUrl: D.urlPublica("audios", "bienvenida.ogg"), mp3Url: D.urlPublica("audios", "bienvenida.mp3") }];
}

async function listaComunidades(): Promise<Resultado> {
  const cs = await D.comunidades();
  if (cs.length === 0) return { respuestas: [texto(T.SIN_COMUNIDADES)] };
  return {
    respuestas: [{
      tipo: "lista", texto: T.ELIGE_COMUNIDAD, boton: "Ver comunidades",
      filas: cs.map((c) => ({ id: `com:${c.id}`, titulo: T.recortar(c.name, 24) })),
    }],
  };
}

/** Por botón de la lista, o escribiendo el nombre (canales sin listas o personas que escriben). */
async function elegirComunidad(e: EntradaBot): Promise<D.Comunidad | null> {
  if (e.botonId?.startsWith("com:")) return D.comunidad(e.botonId.slice(4));
  if (!e.texto) return null;
  const t = T.normalizar(e.texto);
  if (t.length < 3) return null;
  return (await D.comunidades()).find((c) => T.normalizar(c.name) === t || T.normalizar(c.name).includes(t)) ?? null;
}

const menuTemas = (): Salida => ({
  tipo: "botones", texto: T.MENU,
  botones: (Object.keys(MENU) as OpcionMenu[]).map((op) => ({ id: `menu:${op}`, titulo: MENU[op].titulo })),
});

/* ---------------------------------------------------------------------- */
async function manejarBoton(id: string, s: D.Suscriptor, ctx: D.Contexto): Promise<Resultado> {
  const [accion, valor, extra] = id.split(":");

  if (accion === "menu") {
    const op = valor as OpcionMenu;
    if (!(op in MENU)) return { respuestas: [menuTemas()] };
    if (!extra) return { respuestas: [{
      tipo: "botones", texto: T.MENU_MOMENTO,
      botones: [{ id: `menu:${op}:antes`, titulo: "Antes" }, { id: `menu:${op}:ahora`, titulo: "Está pasando ahora" }],
    }] };
    const tarjetas = await tarjetasPorIds(extra === "ahora" ? MENU[op].ahora : MENU[op].antes);
    return { respuestas: tarjetas.length ? tarjetas : [texto(T.MENU_SIN_TARJETAS)] };
  }

  if (accion === "rep_si" || accion === "rep_no") {
    const r = await D.reporteDe(valor, s.id);
    if (!r || r.status !== "por_confirmar") return { respuestas: [texto(T.REPORTE_YA_RESUELTO)] };
    if (accion === "rep_no") {
      await D.actualizarReporte(r.id, { status: "descartado", updated_by: "persona" });
      return { respuestas: [texto(T.REPITE)] };
    }
    return confirmarReporte(r);
  }

  if (accion === "rep_com") {
    const r = ctx.reportePendiente ? await D.reporteDe(ctx.reportePendiente, s.id) : null;
    delete ctx.reportePendiente;
    if (!r || r.status !== "por_confirmar") return { respuestas: [texto(T.REPORTE_YA_RESUELTO)] };
    const destino = valor === "mia" ? await D.comunidad(s.community_id!) : await D.comunidad(valor);
    if (!destino) return { respuestas: [texto(T.REPORTE_YA_RESUELTO)] };
    if (destino.id !== r.community_id) await D.actualizarReporte(r.id, { community_id: destino.id });
    return { respuestas: [preguntaConfirmacion({ ...r, community_id: destino.id }, destino.name)] };
  }

  if (accion === "ent_si" || accion === "ent_no") {
    const ok = await D.confirmarEntrega(valor, s.community_id!, accion === "ent_si");
    return { respuestas: [texto(!ok ? T.ENTREGA_YA : accion === "ent_si" ? T.ENTREGA_GRACIAS : T.ENTREGA_NO_LLEGO)] };
  }

  return { respuestas: [menuTemas()] };
}

/* ---------------------------------------------------------------------- */
async function mensajeLibre(e: EntradaBot, s: D.Suscriptor, ctx: D.Contexto): Promise<Resultado> {
  // Límite por usuario: solo cuentan los mensajes libres (los que gastan Gemini). Botones y menú, sin límite.
  // Con un límite que contaba botones, registrarse y navegar el menú ya lo agotaba (prueba del sáb 21/11).
  const ahora = Date.now();
  const v = ctx.ventana && ahora - ctx.ventana.inicio < LIMITES.ventanaMin * 60_000 ? ctx.ventana : { inicio: ahora, n: 0 };
  ctx.ventana = { inicio: v.inicio, n: v.n + 1 };
  if (ctx.ventana.n > LIMITES.mensajesPorVentana)
    return { respuestas: ctx.ventana.n === LIMITES.mensajesPorVentana + 1 ? [texto(MENSAJES.muchosMensajes), menuTemas()] : [] };

  // Tope diario de IA para los canales públicos (web y Telegram, que usa el jurado).
  const tope = Number(process.env.PROBAR_TOPE_DIARIO || 0);
  if (tope > 0 && (e.canal === "web" || e.canal === "telegram") && (await D.usoIAHoyCanalesPublicos()) >= tope)
    return { respuestas: [texto(MENSAJES.topeAgotado), menuTemas()] };

  let m: MensajeEntrante;
  try {
    await D.marcarUsoIA(e.canal, e.mensajeId);
    const r = await interpretarMensaje({ texto: e.texto, audio: e.audio }, await tarjetasEnviables());
    m = r.datos;
  } catch (err) {
    if (err instanceof GeminiNoDisponible) return { respuestas: [texto(MENSAJES.ocupado), menuTemas()] };
    throw err;
  }

  // Confianza baja: pedir repetir; al segundo intento, que lo revise una persona.
  if (m.confianza < UMBRAL_CONFIANZA_REPORTE) {
    ctx.fallosConfianza = (ctx.fallosConfianza ?? 0) + 1;
    if (ctx.fallosConfianza < 2) return { respuestas: [texto(MENSAJES.noEntendi)] };
    ctx.fallosConfianza = 0;
    await D.crearReporte({
      community_id: s.community_id!, subscriber_id: s.id, type: m.reporte?.tipo_reporte ?? "otro", status: "revisar",
      payload: { ...(m.reporte ?? {}), idioma: m.idioma, intencion: m.intencion }, transcript: m.transcripcion,
      confidence: m.confianza, factor: m.reporte?.factor ?? null,
      media_path: e.audio ? await D.guardarAudioReporte(s.id, e.mensajeId, e.audio) : null,
    });
    return { respuestas: [texto(T.REVISAR_HUMANO)] };
  }
  ctx.fallosConfianza = 0;

  if (m.intencion === "pregunta") {
    if (MEDICINAS.test(m.transcripcion) && m.tarjeta_ids.length === 0) return { respuestas: [texto(MENSAJES.sinMedicinas)] };
    const tarjetas = await tarjetasPorIds(m.tarjeta_ids);
    return { respuestas: tarjetas.length ? tarjetas : [texto(MENSAJES.sinTarjeta), menuTemas()] };
  }

  if (m.intencion === "reporte" && m.reporte) {
    const propia = await D.comunidad(s.community_id!);
    const r = await D.crearReporte({
      community_id: s.community_id!, subscriber_id: s.id, type: m.reporte.tipo_reporte, status: "por_confirmar",
      payload: { ...m.reporte, idioma: m.idioma }, transcript: m.transcripcion, confidence: m.confianza,
      factor: m.reporte.factor, media_path: e.audio ? await D.guardarAudioReporte(s.id, e.mensajeId, e.audio) : null,
    });
    // ¿Nombró otra comunidad? Se pregunta antes de confirmar (no se decide por la IA).
    const otra = await otraComunidadMencionada(m.reporte.comunidad_mencionada, propia);
    if (otra && propia) {
      ctx.reportePendiente = r.id;
      return { respuestas: [{
        tipo: "botones", texto: T.preguntaComunidad,
        botones: [{ id: "rep_com:mia", titulo: T.recortar(propia.name, 20) }, { id: `rep_com:${otra.id}`, titulo: T.recortar(otra.name, 20) }],
      }] };
    }
    return { respuestas: [preguntaConfirmacion(r, propia?.name ?? "tu comunidad")] };
  }

  return { respuestas: [texto(T.OTRO), menuTemas()] };
}

async function otraComunidadMencionada(mencion: string | null, propia: D.Comunidad | null): Promise<D.Comunidad | null> {
  if (!mencion || !propia) return null;
  const m = T.normalizar(mencion);
  const coincide = (nombre: string) => { const n = T.normalizar(nombre); return n.length > 2 && (m.includes(n) || n.includes(m)); };
  if (coincide(propia.name)) return null;
  return (await D.comunidades()).find((c) => c.id !== propia.id && coincide(c.name)) ?? null;
}

function preguntaConfirmacion(r: D.Reporte, comunidad: string): Salida {
  const p = r.payload as { dias_sin_recurso?: number | null; familias_afectadas?: number | null; animales_afectados?: number | null };
  return {
    tipo: "botones",
    texto: T.resumenReporte({
      comunidad, tipo: r.type, dias: p.dias_sin_recurso ?? null, familias: p.familias_afectadas ?? null, animales: p.animales_afectados ?? null,
    }),
    botones: [{ id: `rep_si:${r.id}`, titulo: "✅ Sí" }, { id: `rep_no:${r.id}`, titulo: "🔁 No, repetir" }],
  };
}

/** Confirmación: el reporte entra a la prioridad pública y se envía la tarjeta de su factor (sin IA). */
async function confirmarReporte(r: D.Reporte): Promise<Resultado> {
  const c = await D.comunidad(r.community_id);
  const p = r.payload as { dias_sin_recurso?: number | null; familias_afectadas?: number | null; animales_afectados?: number | null };
  const res = prioridad({
    diasSinRecurso: p.dias_sin_recurso ?? null,
    familias: p.familias_afectadas ?? c?.families ?? null,
    animales: p.animales_afectados ?? c?.animals ?? null,
    horasDesdeReporte: 0,
  });
  await D.actualizarReporte(r.id, {
    status: "confirmado", confirmed_at: new Date().toISOString(), updated_by: "persona",
    priority_score: res.score, priority_breakdown: { ...res, urgencia: urgencia(res.score) },
  });
  const respuestas: Salida[] = [texto(T.reporteConfirmado(c?.name ?? "tu comunidad"))];
  const idFactor = r.factor ? await D.idTarjetaPorFactor(r.factor) : null;
  const tarjeta = idFactor ? await salidaTarjeta(idFactor) : null;
  if (tarjeta) respuestas.push(texto(T.MIENTRAS_TANTO), tarjeta);
  return { respuestas };
}

/** Tarjetas en el orden pedido, armadas por lib/tarjetas (regla de publicación y etiquetas). Las no publicables se omiten. */
async function tarjetasPorIds(ids: readonly string[]): Promise<Salida[]> {
  const salidas = await Promise.all(ids.map((id) => salidaTarjeta(id)));
  return salidas.filter((x): x is NonNullable<typeof x> => x !== null);
}
