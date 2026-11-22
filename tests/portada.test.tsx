import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BandaAviso, nivelBanda } from "@/components/portada/BandaAviso";

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
  it("el nivel sale del riesgo del Senamhi: alto → roja, medio → naranja, lo demás → informativo", () => {
    expect(nivelBanda("alto")).toBe("roja");
    expect(nivelBanda("medio")).toBe("naranja");
    expect(nivelBanda("bajo")).toBe("info");
    expect(nivelBanda(null)).toBe("info");
  });

  it("riesgo alto vigente: ALERTA ROJA · HELADA FUERTE, con la cita, qué hacer y el boletín original", () => {
    const html = renderToStaticMarkup(<BandaAviso alerta={alerta()} hoy="2026-11-22" />);
    expect(html).toContain("ALERTA ROJA · HELADA FUERTE");
    expect(html).toContain("Se prevén heladas en el altiplano");
    expect(html).toContain('href="/tarjetas/helada-antes_familia-01"');
    expect(html).toContain('href="https://senamhi.gob.bo/boletin.pdf"');
    expect(html).toContain("Fuente oficial: Senamhi");
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
    expect(renderToStaticMarkup(<BandaAviso alerta={null} />)).toContain("No hay un aviso del Senamhi vigente");
  });
});
