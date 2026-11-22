import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLORES, COLOR_NIVEL, type NombreColor } from "@/components/ui/tokens";

/** Contraste WCAG 2.x entre dos colores #RRGGBB. */
function luminancia(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const css = readFileSync(path.join(import.meta.dirname, "..", "app", "globals.css"), "utf8");
const varCss = (nombre: string) => css.match(new RegExp(`--color-${nombre}:\\s*(#[0-9A-Fa-f]{6})\\s*;`))?.[1];
const C = (n: NombreColor) => COLORES[n];
const BLANCO = "#FFFFFF";

/** Pares texto/fondo que usan los componentes y las páginas. Texto normal: ≥ 4,5:1. */
const PARES_TEXTO: [texto: string, fondo: string, nombre: string][] = [
  // Texto sobre superficies
  ...(["fondo", "superficie", "superficie-2", "marca-suave", "gris-suave"] as const).flatMap((f) =>
    (["tinta", "tinta-2", "marca"] as const).map((t): [string, string, string] => [C(t), C(f), `${t} sobre ${f}`]),
  ),
  [C("acento"), C("superficie"), "acento sobre superficie"],
  [C("acento"), C("fondo"), "acento sobre fondo"],
  // Texto blanco sobre colores llenos (botones, cabecera, bandas de alerta, insignias)
  ...(["marca", "marca-oscura", "acento", "roja", "naranja", "ocre", "verde", "tinta", "tinta-2", "gris-tinta"] as const).map(
    (f): [string, string, string] => [BLANCO, C(f), `blanco sobre ${f}`],
  ),
  // Texto oscuro de cada nivel sobre su fondo suave (insignias y avisos suaves)
  ...(["roja", "naranja", "ocre", "verde", "gris"] as const).map((n): [string, string, string] => [
    C(`${n}-tinta`),
    C(`${n}-suave`),
    `${n}-tinta sobre ${n}-suave`,
  ]),
  // El color lleno de cada nivel usado como texto (p. ej. "Muy alta" en la lista)
  ...(["roja", "naranja", "ocre", "verde"] as const).flatMap((n) =>
    (["superficie", "fondo"] as const).map((f): [string, string, string] => [C(n), C(f), `${n} sobre ${f}`]),
  ),
  // Grises viejos de Tailwind, oscurecidos en globals.css
  ...(["stone-400", "stone-500"] as const).flatMap((g) =>
    ([BLANCO, C("fondo"), "#FAFAF9", "#F5F5F4"] as const).map((f): [string, string, string] => [varCss(g) ?? "#000000", f, `${g} sobre ${f}`]),
  ),
];

/** Íconos, marcadores y bordes que transmiten algo: ≥ 3:1. */
const PARES_GRAFICOS: [color: string, fondo: string, nombre: string][] = [
  [C("borde-fuerte"), C("superficie"), "borde-fuerte sobre superficie"],
  [C("borde-fuerte"), C("fondo"), "borde-fuerte sobre fondo"],
  // Marcadores del mapa sobre el fondo claro de CARTO Positron (~#FAFAF8) y sobre hueso
  ...Object.entries(COLOR_NIVEL).flatMap(([n, color]) =>
    ["#FAFAF8", C("fondo"), C("superficie")].map((f): [string, string, string] => [color, f, `nivel ${n} sobre ${f}`]),
  ),
];

describe("tokens de color", () => {
  it("globals.css y components/ui/tokens.ts tienen los mismos valores", () => {
    for (const [nombre, valor] of Object.entries(COLORES)) {
      expect(varCss(nombre)?.toUpperCase(), `--color-${nombre}`).toBe(valor.toUpperCase());
    }
  });

  it("no queda modo oscuro y el esquema es solo claro", () => {
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
    expect(css).toMatch(/color-scheme:\s*only light/);
  });
});

describe("contraste WCAG AA", () => {
  it("la fórmula da los valores conocidos", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contraste("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it.each(PARES_TEXTO)("texto %s sobre %s (%s) ≥ 4,5:1", (texto, fondo) => {
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PARES_GRAFICOS)("gráfico %s sobre %s (%s) ≥ 3:1", (color, fondo) => {
    expect(contraste(color, fondo)).toBeGreaterThanOrEqual(3);
  });
});
