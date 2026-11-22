import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ETIQUETA_BORRADOR,
  MAX_BOTONES,
  MENU,
  Tarjeta,
  menuVisible,
  construirMensajeAlerta,
  contarPalabras,
  type AvisoGemini,
} from "@/contratos/tipos";
import { TarjetaVisual } from "@/components/tarjeta/TarjetaVisual";
import { problemasDeAutor, problemasDeContenido, problemasDeVerificacion } from "@/lib/tarjeta-contenido";
import {
  ID_ENCABEZADO_RESPALDO,
  audioVigente,
  baseStorage,
  huellaContenido,
  permitirBorrador,
  pngVigente,
  puedePublicarse,
  resolverImagenes,
  resumirFuentes,
  rutaAudioTarjeta,
  rutaPngTarjeta,
  tarjetaASalidaBot,
} from "@/lib/tarjeta-publica";

const crudo: unknown[] = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "tarjetas", "tarjetas.json"), "utf8"));
const tarjetas = crudo.map((t) => Tarjeta.parse(t));
const porId = (id: string) => tarjetas.find((t) => t.id === id)!;
const SUPABASE_URL = "https://ejemplo.supabase.co";
const BASE = baseStorage(SUPABASE_URL);

describe("las tarjetas del paquete", () => {
  it("validan con el contrato Tarjeta (las 6 del MVP y las nuevas v0.4)", () => {
    expect(crudo.length).toBeGreaterThanOrEqual(6);
    for (const t of crudo) {
      const r = Tarjeta.safeParse(t);
      expect(r.success, `${(t as { id: string }).id}: ${r.error?.message}`).toBe(true);
    }
  });

  it("ningún paso supera 18 palabras y cada paso tiene su fuente con página", () => {
    for (const t of tarjetas) {
      expect(t.step_sources).toHaveLength(t.steps.length);
      expect(t.steps.length).toBeGreaterThanOrEqual(3);
      expect(t.steps.length).toBeLessThanOrEqual(5);
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

  it("author es el autor de la guía citada, nunca el equipo ni la IA", () => {
    for (const t of tarjetas) expect(problemasDeAutor(t), t.id).toEqual([]);
    const t = porId("helada-antes_animales-01");
    expect(problemasDeAutor({ ...t, author: "Jhonatan con asistencia de IA" })).not.toEqual([]);
    expect(problemasDeAutor({ ...t, author: "CIPCA" })).not.toEqual([]); // CIPCA no se cita en esta tarjeta
    expect(problemasDeAutor({ ...t, author: "FAO; Senamhi–INSA" })).toEqual([]);
  });

  it("verificada exige verified_by (author es el autor de la guía; no hay regla contra él)", () => {
    const t = crudo[0] as Record<string, unknown>;
    expect(Tarjeta.safeParse({ ...t, status: "verificada", verified_by: null }).success).toBe(false);
    expect(Tarjeta.safeParse({ ...t, status: "verificada", verified_by: "Otra persona" }).success).toBe(true);
    expect(Tarjeta.safeParse({ ...t, status: "revisada", verified_by: "Otra persona", reviewed_by: null }).success).toBe(false);
  });
});

describe("regla de publicación (DEMO_PERMITIR_BORRADOR)", () => {
  // Las pruebas de la regla no dependen del estado real de los datos: arman su propia versión en borrador.
  const borrador = Tarjeta.parse({ ...porId("sequia-durante-01"), status: "borrador", verified_by: null, reviewed_by: null });
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
    const msg = construirMensajeAlerta({ aviso, tarjeta: { ...porId("helada-antes_familia-01"), status: "borrador" }, boletinEsEjemplo: false });
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

describe("tarjetas v0.4 de 4 y 5 pasos", () => {
  it("se dibujan con todos sus pasos (ícono de respaldo donde no hay imagen)", () => {
    for (const id of ["sequia-durante-03", "nevada-antes_animales-01"]) {
      const t = porId(id);
      const imagenes = resolverImagenes(t, BASE, null);
      expect(imagenes.pasos).toHaveLength(t.steps.length);
      const html = renderToStaticMarkup(<TarjetaVisual tarjeta={t} imagenes={imagenes} variante="imagen" />);
      for (const paso of t.steps) expect(html).toContain(paso.replace(/"/g, "&quot;").slice(0, 30));
    }
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
  const IDS_MVP = ["helada-antes_familia-01", "helada-antes_animales-01", "helada-durante-01", "sequia-antes_familia-01", "sequia-antes_animales-01", "sequia-durante-01"];

  it("coincide con el mapeo fijo de docs/mvp.md", () => {
    expect(MENU.agua.antes).toEqual(["sequia-antes_familia-01"]);
    expect(MENU.agua.ahora).toEqual(["sequia-durante-01", "sequia-durante-03"]);
    expect(MENU.animales.antes).toEqual(["sequia-antes_animales-01", "helada-antes_animales-01"]);
    expect(MENU.animales.ahora).toEqual(["sequia-durante-01", "helada-durante-01", "sequia-durante-04"]);
    expect(MENU.cultivos.antes).toEqual(["helada-antes_familia-01"]);
    // helada-durante-01 trata de animales desde la v0.3 (corregido sáb 21/11): Cultivos no la muestra.
    expect(MENU.cultivos.ahora).toEqual(["helada-antes_familia-01", "sequia-durante-02", "helada-despues-01"]);
    expect(MENU.nevada.antes).toEqual(["nevada-antes_animales-01"]);
    // Las tarjetas v0.4 van al final: lo que se veía antes sale primero, igual que siempre.
    expect(MENU.agua.ahora[0]).toBe("sequia-durante-01");
  });

  it("'Cultivos' solo muestra tarjetas de cultivos (no de animales)", () => {
    const DE_ANIMALES = ["animales_sin_abrigo", "sin_reserva_forraje"];
    for (const id of [...MENU.cultivos.antes, ...MENU.cultivos.ahora]) {
      const t = tarjetas.find((x) => x.id === id)!;
      expect(t.factor_tags.some((f) => DE_ANIMALES.includes(f)), id).toBe(false);
      expect(t.factor_tags.some((f) => f.startsWith("cultivos") || f === "perdida_por_helada"), id).toBe(true);
    }
  });

  it("el menú solo muestra opciones con tarjetas enviables; Nevada aparece al verificar la suya", () => {
    const hoy = new Set(IDS_MVP);
    expect(menuVisible(hoy)).toEqual(["agua", "animales", "cultivos"]);
    expect(menuVisible(new Set([...hoy, "nevada-antes_animales-01"]))).toContain("nevada");
    expect(menuVisible(new Set())).toEqual(Object.keys(MENU)); // base vacía: todas (responde sin tarjetas)
    expect(MAX_BOTONES).toBe(3);
  });

  it("cada id del menú es una tarjeta del paquete, y las 6 del MVP están en el menú", () => {
    const ids = new Set(tarjetas.map((t) => t.id));
    for (const id of idsMenu) expect(ids.has(id), id).toBe(true);
    for (const id of IDS_MVP) expect(idsMenu, id).toContain(id);
  });
});

describe("corregir después de verificar", () => {
  const base = porId("sequia-durante-01");
  const verificada = Tarjeta.parse({ ...base, status: "verificada", verified_by: "Ana" });
  const huella = huellaContenido(verificada);
  const corregida = { ...verificada, steps: [verificada.steps[0], "Rota el pastoreo en los bofedales.", verificada.steps[2]] as [string, string, string] };

  it("la huella de contenido cambia con el texto y NO con el estado", () => {
    expect(huellaContenido({ ...verificada, status: "revisada" } as never)).toBe(huella);
    expect(huellaContenido(corregida)).not.toBe(huella);
    expect(huellaContenido({ ...verificada, step_sources: [verificada.step_sources[0], verificada.step_sources[1], { doc: "Otro doc", page: "p. 1" }] })).not.toBe(huella);
  });

  it("verificada sin verified_hash no se carga", () => {
    expect(problemasDeVerificacion(verificada, undefined)).not.toEqual([]);
  });

  it("verificada con la huella de su texto se carga", () => {
    expect(problemasDeVerificacion(verificada, huella)).toEqual([]);
  });

  it("si el texto cambia después de verificar, el seed la rechaza", () => {
    const p = problemasDeVerificacion(corregida, huella);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("cambiaron DESPUÉS de verificarla");
  });

  it("en borrador no se exige huella", () => {
    expect(problemasDeVerificacion({ ...corregida, status: "borrador" }, undefined)).toEqual([]);
  });

  it("toda tarjeta verificada o revisada del JSON tiene su verificación vigente", () => {
    for (const fila of crudo as Record<string, unknown>[]) {
      const t = Tarjeta.parse(fila);
      expect(problemasDeVerificacion(t, fila.verified_hash), t.id).toEqual([]);
    }
  });

  it("el bot solo adjunta el audio grabado con el texto actual", () => {
    const opciones = { permitirBorrador: false, supabaseUrl: SUPABASE_URL };
    const conAudio = { ...verificada, audio_ogg_path: rutaAudioTarjeta(verificada, "ogg"), audio_mp3_path: rutaAudioTarjeta(verificada, "mp3") };
    expect(audioVigente(conAudio, "ogg")).toBe(true);
    const s = tarjetaASalidaBot(conAudio, opciones)!;
    expect(s.audioOggUrl).toContain(`sequia-durante-01-${huella}.ogg`);
    expect(s.audioMp3Url).toBeDefined();
    // Se corrige un paso: el audio viejo dice otra cosa y deja de adjuntarse (la tarjeta se envía igual).
    const tras = tarjetaASalidaBot({ ...conAudio, steps: corregida.steps }, opciones)!;
    expect(tras.audioOggUrl).toBeUndefined();
    expect(tras.audioMp3Url).toBeUndefined();
    expect(tras.pasos).toEqual(corregida.steps);
    // Un audio subido con el nombre viejo (sin huella) tampoco se adjunta.
    expect(tarjetaASalidaBot({ ...verificada, audio_ogg_path: "lessons/sequia-durante-01.ogg" }, opciones)!.audioOggUrl).toBeUndefined();
  });
});
