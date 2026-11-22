import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AvisoGemini, construirMensajeAlerta, decidirAlerta, tarjetaParaAlerta } from "@/contratos/tipos";

// Comunicado de última hora cargado a mano: el aviso se arma con los datos del formulario (sin IA).
const aviso = AvisoGemini.parse({
  encontrado: true, zona: "Altiplano de Oruro", estacion: null, periodo_inicio: "2026-11-22", periodo_fin: "2026-11-23", fenomeno: "nevada",
  temp_minima_c: null, cita_evento: "Se prevén nevadas en el Altiplano.", cita_riesgo: null, riesgo_helada: null, nivel_senamhi: "naranja", confianza: 1,
});
const tarjeta = (JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8")) as { id: string }[])
  .find((t) => t.id === "nevada-antes_animales-01") as never;

describe("comunicado manual y simulacro", () => {
  it("con nivel del comunicado, el código decide alertar", () => {
    expect(decidirAlerta(aviso).alertar).toBe(true);
  });

  it("simulacro: el encabezado dice SIMULACRO y no lo confunde con un boletín histórico", () => {
    const m = construirMensajeAlerta({ aviso, tarjeta, boletinEsEjemplo: true, boletinUrl: "https://senamhi.gob.bo/x", simulacro: true });
    expect(m.split("\n")[0]).toMatch(/^SIMULACRO · /);
    expect(m).not.toContain("boletín histórico");
    expect(m).toContain("Se prevén nevadas en el Altiplano.");
    expect(m).toContain("https://senamhi.gob.bo/x");
  });

  it("comunicado real: sin la palabra SIMULACRO", () => {
    const m = construirMensajeAlerta({ aviso, tarjeta, boletinEsEjemplo: false, boletinUrl: "https://senamhi.gob.bo/x" });
    expect(m).not.toContain("SIMULACRO");
  });

  it("comunicado: cita la fuente como comunicado del Senamhi y enlaza el original", () => {
    const m = construirMensajeAlerta({ aviso, tarjeta, boletinEsEjemplo: false, boletinUrl: "https://senamhi.gob.bo/x", comunicado: true });
    expect(m).toContain("Fuente oficial: comunicado del Senamhi.");
    expect(m).toContain("Ver el comunicado original: https://senamhi.gob.bo/x");
    expect(m).not.toContain("boletín agrometeorológico");
  });

  it("cada amenaza apunta a una tarjeta que existe", () => {
    const ids = new Set((JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8")) as { id: string }[]).map((t) => t.id));
    for (const a of ["helada", "sequia", "nevada"] as const) expect(ids.has(tarjetaParaAlerta(a)), a).toBe(true);
  });
});
