"use server";
import { ErrorAcceso, exigirAcceso } from "@/lib/acceso-panel";
import { contenidoDesdeFormulario } from "@/lib/editor-tarjetas-contenido";
import {
  ErrorEditor,
  crearVersion,
  devolverVersion,
  publicarVersion,
  registrarFuente,
  retirarTarjeta,
} from "@/lib/editor-tarjetas";
import type { Rol } from "@/lib/sesion";
import type { Resultado } from "@/app/panel/acciones";

/*
 * Editor de tarjetas y fuentes. CADA acción vuelve a validar la sesión y el rol:
 *   editor (o admin): guardar versión y registrar fuente · verificador (o admin): publicar o devolver · admin: retirar.
 * Quien redacta una versión nunca puede publicarla (lo comprueba lib/editor-tarjetas y una regla en la base).
 */
async function ejecutar(rol: Rol, fn: (usuario: string) => Promise<string>): Promise<Resultado> {
  try {
    const { usuario } = await exigirAcceso(rol);
    return { ok: true, mensaje: await fn(usuario) };
  } catch (e) {
    if (e instanceof ErrorAcceso || e instanceof ErrorEditor) return { ok: false, mensaje: e.message };
    console.error("editor de tarjetas", e);
    return { ok: false, mensaje: e instanceof Error ? e.message : String(e) };
  }
}

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function guardarVersion(form: FormData): Promise<Resultado> {
  return ejecutar("editor", async (u) => {
    const contenido = contenidoDesdeFormulario(form);
    await crearVersion(contenido, texto(form, "motivo"), u);
    return `Versión de ${contenido.id} guardada en borrador. Ahora otra persona tiene que verificarla en Tarjetas › Por verificar. Mientras tanto se sigue enviando la versión vigente.`;
  });
}

export async function publicar(id: string, form: FormData): Promise<Resultado> {
  return ejecutar("verificador", async (u) => {
    if (form.get("cotejado") !== "si") throw new ErrorEditor("Marca que cotejaste cada texto con la página citada.");
    const r = await publicarVersion(id, u, texto(form, "observacion"));
    return `Publicada: ${r.lessonId}, verificada por ${u}.${r.audio ? " Audio generado." : " Sin audio por ahora (se envía solo con texto)."}`;
  });
}

export async function devolver(id: string, form: FormData): Promise<Resultado> {
  return ejecutar("verificador", async (u) => {
    await devolverVersion(id, u, texto(form, "observacion"));
    return "Devuelta con la observación. La versión vigente sigue publicada.";
  });
}

export async function retirar(lessonId: string, form: FormData): Promise<Resultado> {
  return ejecutar("admin", async (u) => {
    await retirarTarjeta(lessonId, u, texto(form, "motivo"));
    return `${lessonId} retirada: ya no se envía ni se muestra. Queda en el historial con el motivo.`;
  });
}

export async function guardarFuente(form: FormData): Promise<Resultado> {
  return ejecutar("editor", async (u) => {
    const id = await registrarFuente({
      institucion: texto(form, "institucion"), titulo: texto(form, "titulo"), anio: Number(texto(form, "anio")),
      url: texto(form, "url"), clave: texto(form, "clave"), nota: texto(form, "nota") || null,
    }, u);
    return `Fuente registrada (${id}). Ya se puede elegir en el editor de tarjetas.`;
  });
}
