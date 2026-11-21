import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ETIQUETA_BORRADOR,
  MENU,
  Tarjeta,
  construirMensajeAlerta,
  contarPalabras,
  type AvisoGemini,
} from "@/contratos/tipos";
import { TarjetaVisual } from "@/components/tarjeta/TarjetaVisual";
import { problemasDeContenido } from "@/lib/tarjeta-contenido";
import {
  ID_ENCABEZADO_RESPALDO,
  baseStorage,
  permitirBorrador,
  pngVigente,
  puedePublicarse,
  resolverImagenes,
  resumirFuentes,
  rutaPngTarjeta,
  tarjetaASalidaBot,
} from "@/lib/tarjeta-publica";

const crudo: unknown[] = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8"));
const tarjetas = crudo.map((t) => Tarjeta.parse(t));
const porId = (id: string) => tarjetas.find((t) => t.id === id)!;
const SUPABASE_URL = "https://ejemplo.supabase.co";
const BASE = baseStorage(SUPABASE_URL);

describe("las 6 tarjetas del paquete", () => {
  it("validan con el contrato Tarjeta", () => {
    expect(crudo).toHaveLength(6);
    for (const t of crudo) {
      const r = Tarjeta.safeParse(t);
      expect(r.success, `${(t as { id: string }).id}: ${r.error?.message}`).toBe(true);
    }
  });

  it("ningún paso supera 18 palabras y cada paso tiene su fuente con página", () => {
    for (const t of tarjetas) {
      expect(t.step_sources).toHaveLength(3);
      t.steps.forEach((paso, i) => {
        expect(contarPalabras(paso), `${t.id} paso ${i + 1}`).toBeLessThanOrEqual(18);
        expect(t.step_sources[i].doc.trim().length, `${t.id} paso ${i + 1} doc`).toBeGreaterThan(3);
        expect(t.step_sources[i].page.trim().length, `${t.id} paso ${i + 1} página`).toBeGreaterThan(0);
      });
    }
  });

  it("ningún texto contiene dosis, medicamentos ni 'reduce el tamaño del hato'", () => {
    for (const t of tarjetas) expect(problemasDeContenido(t), t.id).toEqual([]);
    const textoTodo = JSON.stringify(crudo).toLowerCase();
    expect(textoTodo).not.toMatch(/reduce\s+el\s+tama[ñn]o\s+del\s+hato/);
  });

  it("el detector de contenido prohibido sí detecta los casos vetados", () => {
    const base = porId("sequia-durante-01");
    const malo = (paso: string) => problemasDeContenido({ ...base, steps: [paso, base.steps[1], base.steps[2]] });
    expect(malo("Aplica la dosis indicada al animal.")).not.toEqual([]);
    expect(malo("Da 5 ml de ivermectina a cada llama.")).not.toEqual([]);
    expect(malo("Reduce el tamaño del hato antes de la sequía.")).not.toEqual([]);
    expect(malo("Pon una vacuna a las crías.")).not.toEqual([]);
  });

  it("verificada exige verified_by (author es el autor de la guía; no hay regla contra él)", () => {
    const t = crudo[0] as Record<string, unknown>;
    expect(Tarjeta.safeParse({ ...t, status: "verificada", verified_by: null }).success).toBe(false);
    expect(Tarjeta.safeParse({ ...t, status: "verificada", verified_by: "Otra persona" }).success).toBe(true);
    expect(Tarjeta.safeParse({ ...t, status: "revisada", verified_by: "Otra persona", reviewed_by: null }).success).toBe(false);
  });
});

describe("regla de publicación (DEMO_PERMITIR_BORRADOR)", () => {
  const borrador = porId("sequia-durante-01");
  const verificada = Tarjeta.parse({ ...borrador, status: "verificada", verified_by: "Otra persona" });

  it("solo '1' enciende el permiso; por defecto está apagado", () => {
    expect(permitirBorrador({})).toBe(false);
    for (const v of ["0", "true", "si", "", " 1"]) expect(permitirBorrador({ DEMO_PERMITIR_BORRADOR: v })).toBe(false);
    expect(permitirBorrador({ DEMO_PERMITIR_BORRADOR: "1" })).toBe(true);
  });

  it("apagado: una tarjeta en borrador no se envía ni se publica", () => {
    expect(puedePublicarse(borrador, false)).toBe(false);
    expect(tarjetaASalidaBot(borrador, { permitirBorrador: false, supabaseUrl: SUPABASE_URL })).toBeNull();
  });

  it("apagado: una tarjeta verificada sí se envía, sin etiqueta de borrador", () => {
    const s = tarjetaASalidaBot(verificada, { permitirBorrador: false, supabaseUrl: SUPABASE_URL })!;
    expect(s).not.toBeNull();
    expect(s.etiquetaEstado).toBe("Verificada contra fuente");
    expect(JSON.stringify(s)).not.toContain(ETIQUETA_BORRADOR);
  });

  it("encendido: la tarjeta en borrador sale con la etiqueta en el mensaje (estado y título)", () => {
    const s = tarjetaASalidaBot(borrador, { permitirBorrador: true, supabaseUrl: SUPABASE_URL })!;
    expect(s).not.toBeNull();
    expect(s.etiquetaEstado).toBe(ETIQUETA_BORRADOR);
    expect(s.titulo).toContain(ETIQUETA_BORRADOR);
  });

  it("encendido: la tarjeta visual (web e imagen) muestra la etiqueta", () => {
    const imagenes = resolverImagenes(borrador, BASE, null);
    for (const variante of ["web", "imagen"] as const) {
      const html = renderToStaticMarkup(<TarjetaVisual tarjeta={borrador} imagenes={imagenes} variante={variante} />);
      expect(html).toContain(ETIQUETA_BORRADOR);
      expect(html).toContain("data-etiqueta-borrador");
    }
    const html = renderToStaticMarkup(<TarjetaVisual tarjeta={verificada} imagenes={imagenes} variante="web" />);
    expect(html).not.toContain(ETIQUETA_BORRADOR);
  });

  it("el mensaje de alerta con una tarjeta en borrador lleva la etiqueta", () => {
    const aviso: AvisoGemini = {
      encontrado: true, zona: "Altiplano Central", estacion: "Oruro", periodo_inicio: "2026-11-14", periodo_fin: "2026-11-23",
      fenomeno: "helada", temp_minima_c: 1, cita_evento: "texto", cita_riesgo: null, riesgo_helada: "medio",
      nivel_senamhi: null, confianza: 0.9,
    };
    const msg = construirMensajeAlerta({ aviso, tarjeta: porId("helada-antes_familia-01"), boletinEsEjemplo: false });
    expect(msg).toContain(ETIQUETA_BORRADOR);
  });

  it("el PNG exportado solo se adjunta si coincide con el estado y el texto actuales", () => {
    const conPng = { ...verificada, card_image_path: rutaPngTarjeta(verificada) };
    expect(pngVigente(conPng)).toBe(true);
    expect(tarjetaASalidaBot(conPng, { permitirBorrador: false, supabaseUrl: SUPABASE_URL })!.imagenUrl).toBeDefined();
    // La misma tarjeta vuelve a borrador: el PNG "verificada" ya no vale.
    const vuelta = { ...conPng, status: "borrador" as const };
    expect(pngVigente(vuelta)).toBe(false);
    expect(tarjetaASalidaBot(vuelta, { permitirBorrador: true, supabaseUrl: SUPABASE_URL })!.imagenUrl).toBeUndefined();
  });

  it("sin audio la tarjeta se envía igual (solo texto e imagen)", () => {
    const s = tarjetaASalidaBot(verificada, { permitirBorrador: false, supabaseUrl: SUPABASE_URL })!;
    expect(s.audioOggUrl).toBeUndefined();
    expect(s.pasos).toEqual(verificada.steps);
  });
});

describe("imágenes con respaldo", () => {
  const t = porId("sequia-durante-01");

  it("sin imágenes de paso se renderiza con un ícono en cada paso", () => {
    const imagenes = resolverImagenes({ ...t, step_image_paths: [] }, BASE, null);
    const html = renderToStaticMarkup(<TarjetaVisual tarjeta={t} imagenes={imagenes} variante="imagen" />);
    expect(html.match(/data-icono="/g)).toHaveLength(3);
    expect(html).toContain('data-icono="semilla"');
    expect(html).toContain('data-icono="heno"');
    expect(html).toContain('data-icono="gotas"');
  });

  it("con un paso faltante, solo ese paso usa ícono", () => {
    const conHueco = { ...t, step_image_paths: ["lessons/x/paso1.webp", null, "lessons/x/paso3.webp"] };
    const html = renderToStaticMarkup(<TarjetaVisual tarjeta={conHueco} imagenes={resolverImagenes(conHueco, BASE, null)} variante="web" />);
    expect(html.match(/data-icono="/g)).toHaveLength(1);
    expect(html).toContain("paso1.webp");
    expect(html).toContain("paso3.webp");
  });

  it("sin encabezado usa el de respaldo (helada-antes_animales-01)", () => {
    const respaldo = `lessons/${ID_ENCABEZADO_RESPALDO}/header.jpg`;
    const imagenes = resolverImagenes({ ...t, header_image_path: null }, BASE, respaldo);
    expect(imagenes.encabezado).toBe(`${BASE}/tarjetas/${respaldo}`);
    const html = renderToStaticMarkup(<TarjetaVisual tarjeta={t} imagenes={imagenes} variante="web" />);
    expect(html).toContain(`${ID_ENCABEZADO_RESPALDO}/header.jpg`);
  });

  it("sin encabezado ni respaldo dibuja una franja neutra (nunca un hueco)", () => {
    const imagenes = resolverImagenes({ ...t, header_image_path: null }, BASE, null);
    const html = renderToStaticMarkup(<TarjetaVisual tarjeta={t} imagenes={imagenes} variante="web" />);
    expect(html).toContain('data-encabezado="neutro"');
  });

  it("el pie lleva las fuentes con página y la nota de IA", () => {
    const html = renderToStaticMarkup(<TarjetaVisual tarjeta={t} imagenes={resolverImagenes(t, BASE, null)} variante="web" />);
    expect(html).toContain("Ilustraciones generadas con IA; siga el texto.");
    for (const linea of resumirFuentes(t.step_sources)) expect(html).toContain(linea.split(":")[0]);
    expect(resumirFuentes(porId("helada-durante-01").step_sources)).toEqual([
      "Senamhi–INSA, Boletín Agrometeorológico Macro Región Altiplano, decena 14–23 nov 2026: p. 8 (pasos 1, 2 y 3)",
    ]);
  });
});

describe("mapeo del menú", () => {
  const idsMenu = [...new Set(Object.values(MENU).flatMap((o) => [...o.antes, ...o.ahora]))];

  it("coincide con el mapeo fijo de docs/mvp.md", () => {
    expect(MENU.agua.antes).toEqual(["sequia-antes_familia-01"]);
    expect(MENU.agua.ahora).toEqual(["sequia-durante-01"]);
    expect(MENU.animales.antes).toEqual(["sequia-antes_animales-01", "helada-antes_animales-01"]);
    expect(MENU.animales.ahora).toEqual(["sequia-durante-01", "helada-durante-01"]);
    expect(MENU.cultivos.antes).toEqual(["helada-antes_familia-01"]);
    expect(MENU.cultivos.ahora).toEqual(["helada-durante-01"]);
  });

  it("resuelve a los 6 ids de las tarjetas que carga el seed", () => {
    expect(idsMenu.sort()).toEqual(tarjetas.map((t) => t.id).sort());
  });
});
