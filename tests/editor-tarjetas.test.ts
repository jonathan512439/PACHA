// Editor de tarjetas (opción 2): formulario → contenido, validación, resumen de fuentes, guion y versiones propuestas.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Tarjeta } from "@/contratos/tipos";
import {
  contenidoDeTarjeta,
  contenidoDesdeFormulario,
  enlaceAPagina,
  guionAudioTarjeta,
  huellaDeContenido,
  resumenFuentes,
  validarContenido,
  type ContenidoTarjeta,
} from "@/lib/editor-tarjetas-contenido";
import { FUENTES, type Fuente } from "@/lib/fuentes";
import { huellaVerificacion } from "@/lib/tarjeta-publica";
import { rolAlcanza } from "@/lib/sesion";

const FAO = "FAO, Sistematización de buenas prácticas (TCP/RLA/3217), caso Jach'a Suyu Pakajaqi y Yapuchiris";

function formulario(campos: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

const base = {
  amenaza: "sequia", fase: "despues", numero: "1", titulo: "Después de la sequía: recupera los pastos nativos",
  paso1: "Trasplanta chilliwa en época de lluvias.", paso1_fuente: FAO, paso1_pagina: "p. 39",
  paso2: "Elige plantas de chilliwa vigorosas.", paso2_fuente: FAO, paso2_pagina: "p. 39",
  paso3: "Trasplanta en líneas rectas.", paso3_fuente: FAO, paso3_pagina: "p. 40",
  paso4: "", paso5: "",
  factor: ["sin_reserva_forraje"], motivo: "Tarjeta nueva",
};

describe("formulario → contenido", () => {
  it("arma el id, ignora pasos vacíos y deduce el resumen de fuentes", () => {
    const c = contenidoDesdeFormulario(formulario(base));
    expect(c.id).toBe("sequia-despues-01");
    expect(c.hazard).toBe("sequia");
    expect(c.phase).toBe("despues");
    expect(c.steps).toHaveLength(3);
    expect(c.source_page).toBe("p. 39; p. 39; p. 40");
    expect(c.author).toBe("FAO");
    expect(c.factor_tags).toEqual(["sin_reserva_forraje"]);
    expect(validarContenido(c, FUENTES)).toEqual([]);
  });

  it("valida igual que el seed: menos de 3 pasos, paso sin fuente, contenido prohibido, fuente no registrada", () => {
    expect(validarContenido(contenidoDesdeFormulario(formulario({ ...base, paso3: "" })), FUENTES).join(" ")).toMatch(/de 3 a 5/);
    expect(validarContenido(contenidoDesdeFormulario(formulario({ ...base, paso2_fuente: "" })), FUENTES).join(" ")).toMatch(/Paso 2: elige la fuente/);
    expect(validarContenido(contenidoDesdeFormulario(formulario({ ...base, paso1: "Aplica una vacuna a las crías." })), FUENTES).join(" ")).toMatch(/medicamento/);
    expect(validarContenido(contenidoDesdeFormulario(formulario({ ...base, paso1_fuente: "Blog de internet, consejos" })), FUENTES).join(" ")).toMatch(/no registrada/);
  });

  it("una fuente registrada en el panel se puede citar", () => {
    const nueva: Fuente = { id: "videci-guia-nevadas-2025", institucion: "VIDECI", titulo: "Guía", anio: 2025, url: "https://example.org/g.pdf",
      claves: ["VIDECI, Guía de nevadas"], tarjetas: [], consultado: "2026-11-22", nota: null };
    const c = contenidoDesdeFormulario(formulario({ ...base, paso1_fuente: "VIDECI, Guía de nevadas" }));
    expect(validarContenido(c, FUENTES).join(" ")).toMatch(/no registrada/);
    expect(validarContenido(c, [...FUENTES, nueva])).toEqual([]);
    expect(resumenFuentes(c.step_sources).author).toBe("VIDECI; FAO");
  });

  it("editar una tarjeta publicada conserva sus imágenes y su huella cambia solo si cambia el texto", () => {
    const tarjetas = (JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8")) as unknown[]).map((t) => Tarjeta.parse(t));
    const t = tarjetas.find((x) => x.id === "sequia-durante-02")!;
    const campos: Record<string, string | string[]> = {
      id: t.id, titulo: t.title, factor: t.factor_tags, motivo: "prueba", step_image_paths: JSON.stringify(["a.webp", "b.webp", "c.webp", "d.webp"]),
      por_que: t.por_que!.texto, por_que_fuente: t.por_que!.fuente.doc, por_que_pagina: t.por_que!.fuente.page,
      pedir_ayuda: t.pedir_ayuda!.texto, pedir_ayuda_fuente: t.pedir_ayuda!.fuente!.doc, pedir_ayuda_pagina: t.pedir_ayuda!.fuente!.page,
    };
    t.steps.forEach((p, i) => { campos[`paso${i + 1}`] = p; campos[`paso${i + 1}_fuente`] = t.step_sources[i].doc; campos[`paso${i + 1}_pagina`] = t.step_sources[i].page; });
    const igual = contenidoDesdeFormulario(formulario(campos));
    expect(igual.step_image_paths).toHaveLength(4);
    expect(huellaDeContenido(igual)).toBe(huellaVerificacion(t));
    const cambiada = contenidoDesdeFormulario(formulario({ ...campos, paso1: "Prefiere variedades precoces." }));
    expect(huellaDeContenido(cambiada)).not.toBe(huellaVerificacion(t));
    expect(contenidoDeTarjeta(t)).not.toHaveProperty("status");
  });
});

describe("guion y enlaces", () => {
  it("el guion lee título, pasos exactos y la fuente", () => {
    const g = guionAudioTarjeta({ title: "Título", steps: ["Uno.", "Dos.", "Tres."], author: "Senamhi–INSA; CDC (EE. UU.)" });
    expect(g).toBe("Título. Paso uno: Uno. Paso dos: Dos. Paso tres: Tres. Fuente: Senamhi y CDC de Estados Unidos.");
  });

  it("el enlace abre el PDF en la página citada", () => {
    expect(enlaceAPagina("https://x.org/a.pdf", "p. 39 y 40")).toBe("https://x.org/a.pdf#page=39");
    expect(enlaceAPagina("https://x.org/a.pdf", "p. 14 del PDF (p. 67 impresa)")).toBe("https://x.org/a.pdf#page=14");
    expect(enlaceAPagina("https://x.org/pagina.html", "página web")).toBe("https://x.org/pagina.html");
    expect(enlaceAPagina(null, "p. 1")).toBeNull();
  });
});

describe("versiones propuestas para la demo", () => {
  const a = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "versiones-propuestas.json"), "utf8")) as {
    redacto: string; versiones: { motivo: string; contenido: ContenidoTarjeta }[];
  };

  it("validan con todas las reglas y citan solo fuentes registradas", () => {
    for (const v of a.versiones) expect(validarContenido(v.contenido, FUENTES), v.contenido.id).toEqual([]);
  });

  it("agua segura pasa a la OPS: hervir 1 minuto más por cada 1000 m", () => {
    const agua = a.versiones.find((v) => v.contenido.id === "sequia-durante-03")!.contenido;
    expect(agua.steps.join(" ")).toMatch(/un minuto más por cada 1000 metros/);
    expect(agua.author).toBe("OPS/OMS");
    expect(resumenFuentes(agua.step_sources)).toMatchObject({ source_doc: agua.source_doc, source_page: agua.source_page, author: agua.author });
  });

  it("las redacta alguien distinto de quien verifica", () => {
    expect(a.redacto).not.toMatch(/jhonatan/i);
  });
});

describe("roles del editor", () => {
  it("editor redacta, verificador publica, admin todo; técnico no edita tarjetas", () => {
    expect(rolAlcanza("editor", "editor")).toBe(true);
    expect(rolAlcanza("verificador", "verificador")).toBe(true);
    expect(rolAlcanza("editor", "verificador")).toBe(false);
    expect(rolAlcanza("verificador", "editor")).toBe(false);
    expect(rolAlcanza("tecnico", "editor")).toBe(false);
    expect(rolAlcanza("admin", "verificador")).toBe(true);
    expect(rolAlcanza("editor", "tecnico")).toBe(true);
    expect(rolAlcanza("editor", "admin")).toBe(false);
  });
});
