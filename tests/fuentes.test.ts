// data/fuentes.json y lib/fuentes.ts: cada cita de cada tarjeta corresponde a una fuente de la lista.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Tarjeta } from "@/contratos/tipos";
import { FUENTES, citasSinFuente, fuentesDeDoc, fuentesDeTarjeta, listarFuentes } from "@/lib/fuentes";

const tarjetas = (JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8")) as unknown[])
  .map((t) => Tarjeta.parse(t));

describe("fuentes oficiales", () => {
  it("ids únicos y enlaces https", () => {
    expect(new Set(FUENTES.map((f) => f.id)).size).toBe(FUENTES.length);
    for (const f of FUENTES) if (f.url) expect(f.url.startsWith("https://"), f.id).toBe(true);
  });

  it("una fuente sin enlace explica por qué en la nota", () => {
    for (const f of FUENTES.filter((x) => !x.url)) expect(f.nota, f.id).toBeTruthy();
  });

  it("toda cita de toda tarjeta corresponde a una fuente de la lista", () => {
    for (const t of tarjetas) expect(citasSinFuente(t), t.id).toEqual([]);
  });

  it("la lista 'tarjetas' de cada fuente coincide con las tarjetas que la citan", () => {
    for (const f of FUENTES) {
      const citan = tarjetas.filter((t) => fuentesDeTarjeta(t).some((x) => x.fuente.id === f.id)).map((t) => t.id).sort();
      expect([...f.tarjetas].sort(), f.id).toEqual(citan);
    }
  });

  it("un paso que cita dos documentos corresponde a las dos fuentes", () => {
    const doble = tarjetas.find((t) => t.id === "sequia-durante-01")!.step_sources[0].doc;
    expect(fuentesDeDoc(doble).map((f) => f.institucion).sort()).toEqual(["CIPCA", "Senamhi–INSA"]);
  });

  it("fuentesDeTarjeta junta las páginas sin repetir", () => {
    const r = fuentesDeTarjeta(tarjetas.find((t) => t.id === "helada-durante-01")!);
    expect(r).toHaveLength(1);
    expect(r[0].paginas).toEqual(["p. 8"]);
  });

  it("listarFuentes devuelve todas", () => {
    expect(listarFuentes()).toHaveLength(FUENTES.length);
  });
});
