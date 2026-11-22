// Contrato v0.4 de tarjetas: campos nuevos opcionales y 3 a 5 pasos, sin romper las 6 tarjetas v0.3.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PEDIR_AYUDA_FIJO,
  SalidaBot,
  Tarjeta,
  construirMensajeAlerta,
  textoPedirAyuda,
  tieneSeccionesV04,
  type AvisoGemini,
} from "@/contratos/tipos";
import { problemasDeContenido, problemasDeVerificacion } from "@/lib/tarjeta-contenido";
import {
  baseStorage,
  huellaContenido,
  huellaTarjeta,
  huellaVerificacion,
  resolverImagenes,
  tarjetaASalidaBot,
  urlTarjetaCompleta,
} from "@/lib/tarjeta-publica";

const crudo: Record<string, unknown>[] = JSON.parse(
  readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8"),
);
/** Las 6 tarjetas del MVP (v0.3): siguen sin secciones v0.4 y con su verificación vigente. */
const IDS_V03 = ["helada-antes_familia-01", "helada-antes_animales-01", "helada-durante-01", "sequia-antes_familia-01", "sequia-antes_animales-01", "sequia-durante-01"];
const tarjetas = crudo.map((t) => Tarjeta.parse(t)).filter((t) => IDS_V03.includes(t.id));
const base = tarjetas.find((t) => t.id === "sequia-antes_familia-01")!;
const fuente = { doc: "FAO, Sistematización de buenas prácticas (TCP/RLA/3217), caso Jach'a Suyu Pakajaqi y Yapuchiris", page: "p. 51" };

/** Tarjeta v0.4 de prueba (texto inventado SOLO para la prueba: nunca se carga). */
const v04 = {
  ...base,
  steps: [...base.steps, "Paso cuatro de prueba.", "Paso cinco de prueba."],
  step_sources: [...base.step_sources, fuente, fuente],
  por_que: { texto: "Frase de prueba de por qué importa.", fuente },
  evitar: [{ texto: "Cosa de prueba que se debe evitar.", fuente }],
  pedir_ayuda: { texto: "Avisa al municipio si hay daños.", fuente: null },
};

describe("contrato v0.4", () => {
  it("las 6 tarjetas v0.3 siguen validando, sin secciones v0.4", () => {
    for (const t of tarjetas) {
      expect(t.steps).toHaveLength(3);
      expect(tieneSeccionesV04(t)).toBe(false);
      expect(textoPedirAyuda(t)).toBe(PEDIR_AYUDA_FIJO);
    }
  });

  it("acepta 5 pasos con por qué, evita y pide ayuda", () => {
    const r = Tarjeta.safeParse(v04);
    expect(r.success, r.error?.message).toBe(true);
    expect(tieneSeccionesV04(r.data!)).toBe(true);
    expect(textoPedirAyuda(r.data!)).toBe("Avisa al municipio si hay daños.");
    expect(problemasDeContenido(r.data!)).toEqual([]);
  });

  it("rechaza 2 o 6 pasos, y pasos sin su fuente", () => {
    expect(Tarjeta.safeParse({ ...base, steps: base.steps.slice(0, 2), step_sources: base.step_sources.slice(0, 2) }).success).toBe(false);
    expect(Tarjeta.safeParse({ ...v04, steps: [...v04.steps, "Seis."], step_sources: [...v04.step_sources, fuente] }).success).toBe(false);
    expect(Tarjeta.safeParse({ ...v04, step_sources: v04.step_sources.slice(0, 4) }).success).toBe(false);
  });

  it("por qué y evita exigen fuente; más de 2 'evita' no valen", () => {
    expect(Tarjeta.safeParse({ ...v04, por_que: { texto: "Sin fuente." } }).success).toBe(false);
    const tres = [v04.evitar[0], v04.evitar[0], v04.evitar[0]];
    expect(Tarjeta.safeParse({ ...v04, evitar: tres }).success).toBe(false);
  });

  it("las secciones v0.4 pasan el filtro de contenido prohibido", () => {
    const mala = Tarjeta.parse({ ...v04, evitar: [{ texto: "No uses medicamentos sin receta.", fuente }] });
    expect(problemasDeContenido(mala).some((p) => p.startsWith("medicamento"))).toBe(true);
  });
});

describe("huellas v0.4", () => {
  it("sin secciones v0.4 la huella de verificación es la de siempre (las 6 siguen verificadas)", () => {
    for (const t of tarjetas) {
      expect(huellaVerificacion(t)).toBe(huellaContenido(t));
      const fila = crudo.find((f) => f.id === t.id)!;
      expect(problemasDeVerificacion(t, fila.verified_hash)).toEqual([]);
    }
  });

  it("cambiar por qué, evita o pide ayuda invalida la verificación, pero no el audio", () => {
    const t = Tarjeta.parse(v04);
    const h = huellaVerificacion(t);
    const otra = { ...t, por_que: { texto: "Otra frase.", fuente } };
    expect(huellaVerificacion(otra)).not.toBe(h);
    expect(huellaTarjeta(otra)).not.toBe(huellaTarjeta(t));
    expect(huellaContenido(otra)).toBe(huellaContenido(t)); // el audio dice título y pasos
    expect(problemasDeVerificacion({ ...otra, status: "verificada" }, h)).toHaveLength(1);
  });
});

describe("presentación v0.4", () => {
  it("una imagen o ícono por paso (3 a 5)", () => {
    const b = baseStorage("https://ejemplo.supabase.co");
    expect(resolverImagenes(base, b, null).pasos).toHaveLength(3);
    expect(resolverImagenes(Tarjeta.parse(v04), b, null).pasos).toHaveLength(5);
  });

  it("el bot envía los 5 pasos y el enlace 'Ver tarjeta completa'", () => {
    const s = tarjetaASalidaBot(Tarjeta.parse(v04), {
      permitirBorrador: false,
      supabaseUrl: "https://ejemplo.supabase.co",
      urlSitio: "https://pacha.example",
    })!;
    expect(SalidaBot.safeParse(s).success).toBe(true);
    expect(s.pasos).toHaveLength(5);
    expect(s.urlCompleta).toBe("https://pacha.example/tarjetas/sequia-antes_familia-01");
    expect(urlTarjetaCompleta(undefined, "x")).toBeNull();
  });

  it("la alerta lista todos los pasos de la tarjeta", () => {
    const aviso: AvisoGemini = {
      encontrado: true, zona: "Altiplano Central", estacion: "Oruro-Ciudad",
      periodo_inicio: "2026-11-14", periodo_fin: "2026-11-23", fenomeno: "sequia", temp_minima_c: null,
      cita_evento: "Cita de prueba.", cita_riesgo: null, riesgo_helada: null, nivel_senamhi: null, confianza: 0.9,
    };
    const texto = construirMensajeAlerta({ aviso, tarjeta: Tarjeta.parse(v04), boletinEsEjemplo: false });
    expect(texto).toContain("5) Paso cinco de prueba.");
  });
});
