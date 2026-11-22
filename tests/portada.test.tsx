import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BandaAviso, citaLegible, nivelBanda } from "@/components/portada/BandaAviso";

const alerta = (o: Partial<Parameters<typeof BandaAviso>[0]["alerta"] & object> = {}) => ({
  id: "a1",
  hazard: "helada",
  zona: "Altiplano de Oruro",
  risk_level: "alto",
  cita_evento: "Se prevén heladas en el altiplano",
  cita_riesgo: "ALTO",
  valid_from: "2026-11-14",
  valid_to: "2026-11-23",
  sent_at: "2026-11-14T12:00:00Z",
  message_text: "",
  lesson_id: "helada-antes_familia-01",
  fuente_url: "https://senamhi.gob.bo/boletin.pdf",
  ...o,
});

describe("banda del aviso en la portada", () => {
  it("el nivel sale de nivelAlerta (H3): alto o rojo → roja, medio o naranja → naranja, lo demás → informativo", () => {
    expect(nivelBanda({ risk_level: "alto" })).toBe("roja");
    expect(nivelBanda({ risk_level: "medio" })).toBe("naranja");
    expect(nivelBanda({ risk_level: "bajo" })).toBe("info");
    expect(nivelBanda({ risk_level: null })).toBe("info");
    expect(nivelBanda({ risk_level: "medio", senamhi_level: "rojo" })).toBe("roja"); // H3: manda el nivel del Senamhi
  });

  it("riesgo alto vigente: ALERTA ROJA · HELADA FUERTE, con la cita, qué hacer y el boletín original", () => {
    const html = renderToStaticMarkup(<BandaAviso alerta={alerta()} hoy="2026-11-22" />);
    expect(html).toContain("ALERTA ROJA · HELADA FUERTE");
    expect(html).toContain("Se prevén heladas en el altiplano");
    expect(html).toContain('href="/tarjetas/helada-antes_familia-01"');
    expect(html).toContain('href="https://senamhi.gob.bo/boletin.pdf"');
    expect(html).toContain("Fuente: Senamhi");
  });

  it("un solo día no dice «22 al 22»; la cita cortada termina en palabra completa con «…»", () => {
    const larga = "Se pronostica cielo despejado durante el día, nuboso con probables chubascos aislados por la noche, la humedad relativa variará entre 40 % y 70 %, vientos CALMOS por la mañana, de dirección NOROESTE p";
    const html = renderToStaticMarkup(<BandaAviso alerta={alerta({ valid_from: "2026-11-22", valid_to: "2026-11-22", cita_evento: larga })} hoy="2026-11-22" />);
    expect(html).toContain("22 de noviembre");
    expect(html).not.toContain("22 al 22");
    expect(html).toContain("de dirección NOROESTE…”");
    expect(citaLegible("Se prevén heladas.")).toBe("Se prevén heladas.");
    expect(citaLegible("Se prevén heladas en el altiplano")).toBe("Se prevén heladas en el altiplano");
  });

  it("un simulacro siempre lo dice (EJEMPLO) y un comunicado no se presenta como boletín decenal", () => {
    const html = renderToStaticMarkup(<BandaAviso alerta={alerta({ hazard: "nevada", senamhi_level: "rojo", simulacro: true, comunicado: true })} hoy="2026-11-22" />);
    expect(html).toContain("NEVADA FUERTE · SIMULACRO");
    expect(html).toContain("no es una emergencia real");
    expect(html).toContain("El comunicado dice");
    expect(html).toContain("Comunicado original");
    expect(html).not.toContain("boletín agrometeorológico decenal");
    const real = renderToStaticMarkup(<BandaAviso alerta={alerta()} hoy="2026-11-22" />);
    expect(real).not.toContain("SIMULACRO");
    expect(real).toContain("boletín agrometeorológico decenal");
  });

  it("riesgo medio: ALERTA NARANJA · HELADA (sin «FUERTE»)", () => {
    const html = renderToStaticMarkup(<BandaAviso alerta={alerta({ risk_level: "medio" })} hoy="2026-11-22" />);
    expect(html).toContain("ALERTA NARANJA · HELADA");
    expect(html).not.toContain("FUERTE");
  });

  it("aviso vencido: no se muestra como alerta, solo como último aviso", () => {
    const html = renderToStaticMarkup(<BandaAviso alerta={alerta()} hoy="2026-11-24" />);
    expect(html).not.toContain("ALERTA ROJA");
    expect(html).toContain("ya terminó");
  });

  it("sin aviso: lo dice claro", () => {
    expect(renderToStaticMarkup(<BandaAviso alerta={null} />)).toContain("No hay avisos vigentes del Senamhi");
  });
});
