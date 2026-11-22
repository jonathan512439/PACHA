// H3 · Alerta por nivel: nivelAlerta, mensaje v2 y guion de audio, con la extracción REAL del boletín 14–23 nov 2026.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AvisoGemini,
  Tarjeta,
  construirMensajeAlerta,
  encabezadoAlerta,
  guionAudioAlerta,
  nivelAlerta,
  nivelAlertaDeAviso,
} from "@/contratos/tipos";

const fixture = JSON.parse(readFileSync(path.join(__dirname, "..", "fixtures", "aviso-altiplano-2026-11-2.json"), "utf8"));
const aviso = AvisoGemini.parse(fixture.aviso);
const URL_BOLETIN: string = fixture.fuente_url;
const tarjeta = (JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8")) as unknown[])
  .map((t) => Tarjeta.parse(t))
  .find((t) => t.id === "helada-antes_familia-01")!;

/** Números que aparecen en un texto (temperaturas, fechas, cantidades). */
const numeros = (s: string) => s.match(/\d+(?:[.,]\d+)?/g) ?? [];

describe("nivelAlerta: la gravedad la pone el Senamhi", () => {
  it("riesgo alto o nivel rojo → roja; medio o naranja → naranja", () => {
    expect(nivelAlerta({ risk_level: "alto", senamhi_level: null })).toBe("roja");
    expect(nivelAlerta({ risk_level: null, senamhi_level: "rojo" })).toBe("roja");
    expect(nivelAlerta({ risk_level: "medio", senamhi_level: null })).toBe("naranja");
    expect(nivelAlerta({ risk_level: null, senamhi_level: "naranja" })).toBe("naranja");
  });

  it("se toma el más alto de los dos datos", () => {
    expect(nivelAlerta({ risk_level: "medio", senamhi_level: "rojo" })).toBe("roja");
    expect(nivelAlerta({ risk_level: "alto", senamhi_level: "amarillo" })).toBe("roja");
  });

  it("bajo, amarillo o sin dato → sin color (no subimos la gravedad)", () => {
    expect(nivelAlerta({ risk_level: "bajo", senamhi_level: null })).toBeNull();
    expect(nivelAlerta({ risk_level: null, senamhi_level: "amarillo" })).toBeNull();
    expect(nivelAlerta({})).toBeNull();
  });

  it("el boletín real (Riesgo MEDIO por helada) es naranja; el riesgo sale de la cita, no del campo suelto", () => {
    expect(nivelAlertaDeAviso(aviso)).toBe("naranja");
    expect(nivelAlertaDeAviso({ ...aviso, riesgo_helada: "alto" })).toBe("naranja"); // la cita dice MEDIO
  });

  it("encabezados", () => {
    expect(encabezadoAlerta("roja", "helada")).toBe("🔴 ALERTA ROJA · HELADA FUERTE");
    expect(encabezadoAlerta("naranja", "helada")).toBe("🟠 ALERTA NARANJA · HELADA");
    expect(encabezadoAlerta(null, "nevada")).toBe("⚠️ AVISO · NEVADA");
  });
});

describe("mensaje de alerta v2 (boletín real)", () => {
  const m = construirMensajeAlerta({ aviso, tarjeta, boletinEsEjemplo: false, boletinUrl: URL_BOLETIN, conAudio: true });

  it("encabezado naranja, zona, período y tono", () => {
    const lineas = m.split("\n");
    expect(lineas[0]).toBe("🟠 ALERTA NARANJA · HELADA");
    expect(lineas[1]).toBe(`${aviso.zona} · 14 al 23 de noviembre de 2026`);
    expect(lineas[2]).toBe("Prepárate desde hoy.");
  });

  it("cita LITERAL del boletín y enlace al PDF original", () => {
    expect(m).toContain(`"${aviso.cita_evento}"`);
    expect(m).toContain(`"${aviso.cita_riesgo}"`);
    expect(m).toContain(`Ver el boletín original: ${URL_BOLETIN}`);
    expect(m).toContain("Fuente oficial: Senamhi");
  });

  it("las cifras salen SOLO de las citas, del período y de la fuente de la tarjeta", () => {
    const permitidas = new Set([
      ...numeros(aviso.cita_evento!), ...numeros(aviso.cita_riesgo!),
      ...numeros("14 al 23 de noviembre de 2026"), ...numeros(tarjeta.source_doc), ...numeros(tarjeta.source_page),
      ...tarjeta.steps.flatMap((_, i) => [String(i + 1)]), ...tarjeta.steps.flatMap(numeros),
    ]);
    const sinUrl = m.replace(URL_BOLETIN, "");
    for (const n of numeros(sinUrl)) expect(permitidas.has(n), `cifra "${n}" no sale del boletín ni de la tarjeta`).toBe(true);
    expect(m).not.toContain(String(aviso.temp_minima_c) + " °C mínima"); // no se arma una cifra propia
  });

  it("los pasos y la fuente de la tarjeta, con su estado", () => {
    tarjeta.steps.forEach((paso, i) => expect(m).toContain(`${i + 1}) ${paso}`));
    expect(m).toContain("Verificada contra fuente");
  });

  it("la voz sintética se declara solo si hay audio", () => {
    expect(m).toContain("🔊 Audio con voz sintética");
    expect(construirMensajeAlerta({ aviso, tarjeta, boletinEsEjemplo: false })).not.toContain("voz sintética");
  });

  it("sin enlace (PDF subido a mano) no inventa uno; EJEMPLO visible", () => {
    const manual = construirMensajeAlerta({ aviso, tarjeta, boletinEsEjemplo: true, boletinUrl: null });
    expect(manual).not.toContain("Ver el boletín original");
    expect(manual.split("\n")[0]).toContain("EJEMPLO");
  });

  it("riesgo alto → roja con 'QUÉ HACER HOY' y 'Actúa hoy.'", () => {
    const alto = { ...aviso, cita_riesgo: "Riesgo ALTO por helada", riesgo_helada: "alto" as const };
    const r = construirMensajeAlerta({ aviso: alto, tarjeta, boletinEsEjemplo: false });
    expect(r.split("\n")[0]).toBe("🔴 ALERTA ROJA · HELADA FUERTE");
    expect(r).toContain("Actúa hoy.");
    expect(r).toContain("QUÉ HACER HOY");
  });
});

describe("guion del audio de la alerta", () => {
  const g = guionAudioAlerta(aviso, tarjeta);

  it("repite el encabezado al inicio y dice zona, fechas y quién lo anuncia", () => {
    expect(g.startsWith("Atención. Alerta naranja. Alerta naranja por helada en el Altiplano Central, del 14 al 23 de noviembre de 2026.")).toBe(true);
    expect(g).toContain("Lo anuncia el Senamhi.");
  });

  it("lee los pasos exactos de la tarjeta", () => {
    for (const paso of tarjeta.steps) expect(g).toContain(paso.replace(/\.$/, ""));
  });

  it("sin enlace, sin la línea de voz sintética y sin cifras propias", () => {
    expect(g).not.toMatch(/https?:/);
    expect(g).not.toContain("voz sintética");
    expect(g).not.toContain("°C");
  });

  it("dura unos 20 s (máx. ~80 palabras)", () => {
    expect(g.split(/\s+/).length).toBeLessThanOrEqual(80);
  });

  it("sin tarjeta publicable no lee pasos", () => {
    expect(guionAudioAlerta(aviso, null)).not.toContain("Desde hoy:");
  });
});
