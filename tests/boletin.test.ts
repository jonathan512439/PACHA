import { describe, expect, it, vi } from "vitest";

// lib/boletin importa Supabase, Gemini y los canales: se aíslan para probar solo la lectura de la página.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ db: () => { throw new Error("no se usa en esta prueba"); } }));
vi.mock("@/lib/gemini", () => ({ extraerAviso: vi.fn(), GeminiNoDisponible: class extends Error {} }));
vi.mock("@/lib/tarjetas", () => ({ obtenerTarjeta: vi.fn() }));
vi.mock("@/lib/canales/enviar", () => ({ contactoTecnica: () => null, enviarPorCanal: vi.fn() }));

const { enlacesAltiplano, masReciente } = await import("@/lib/boletin");
const { usuarioPanel, esCron } = await import("@/lib/panel-auth");
const { construirMensajeAlerta, AvisoGemini } = await import("@/contratos/tipos");

// Fragmento con el formato REAL de https://senamhi.gob.bo/meteorologia/agromet-decenal (sáb 21/11/2026).
const HTML = `
<a href="https://senamhi.gob.bo/../agromet/boletines_agrometeorologia/boletines_decenales/2026/NOVIEMBRE/1 DECENA/7 BOLETíN CHIQUITANIA 2026-11-1.pdf">x</a>
<a href="https://senamhi.gob.bo/../agromet/boletines_agrometeorologia/boletines_decenales/2026/NOVIEMBRE/1 DECENA/1 BOLETíN ALTIPLANO 2026-11-1.pdf">x</a>
<a href="https://senamhi.gob.bo/../agromet/boletines_agrometeorologia/boletines_decenales/2026/NOVIEMBRE/2 DECENA/1 BOLETíN ALTIPLANO 2026-11-2.pdf">x</a>
<a href="https://senamhi.gob.bo/../agromet/boletines_agrometeorologia/boletines_decenales/2026/OCTUBRE/3 DECENA/1 BOLETíN ALTIPLANO 2026-10-3.pdf">x</a>
<a href="https://senamhi.gob.bo/../agromet/boletines_agrometeorologia/boletines_decenales/2025/SETIEMBRE/2 DECENA/1 BOLETíN ALTIPLANO 2025-9-2.pdf">x</a>
<a href="/otra/cosa.pdf">x</a>`;

describe("lectura de la página de boletines del Senamhi", () => {
  it("encuentra solo los ALTIPLANO y arma la clave", () => {
    const e = enlacesAltiplano(HTML);
    expect(e.map((x) => x.clave)).toEqual(["altiplano-2026-11-1", "altiplano-2026-11-2", "altiplano-2026-10-3", "altiplano-2025-09-2"]);
  });

  it("normaliza la URL igual que la que funcionó a mano (espacios y tilde codificados, sin /../)", () => {
    const ultimo = masReciente(enlacesAltiplano(HTML));
    expect(ultimo?.url).toBe("https://senamhi.gob.bo/agromet/boletines_agrometeorologia/boletines_decenales/2026/NOVIEMBRE/2%20DECENA/1%20BOLET%C3%ADN%20ALTIPLANO%202026-11-2.pdf");
    expect(ultimo).toMatchObject({ anio: 2026, mes: 11, decena: 2 });
  });

  it("sin enlaces reconocibles devuelve null (y el panel avisa que cambió el formato)", () => {
    expect(masReciente(enlacesAltiplano("<html>nada</html>"))).toBeNull();
  });
});

describe("autenticación del panel y del cron", () => {
  const env = { PANEL_USERS: "patricia:clave-1,marco:otra:con:dos-puntos", CRON_SECRET: "secreto-cron" };
  const basic = (u: string, p: string) => "Basic " + btoa(`${u}:${p}`);

  it("acepta usuario y clave correctos y devuelve el nombre", () => {
    expect(usuarioPanel(basic("patricia", "clave-1"), env)).toBe("patricia");
    expect(usuarioPanel(basic("marco", "otra:con:dos-puntos"), env)).toBe("marco");
  });
  it("rechaza clave mala, usuario desconocido, formato roto y PANEL_USERS vacío", () => {
    expect(usuarioPanel(basic("patricia", "mala"), env)).toBeNull();
    expect(usuarioPanel(basic("nadie", "clave-1"), env)).toBeNull();
    expect(usuarioPanel("Basic %%%no-base64", env)).toBeNull();
    expect(usuarioPanel("Bearer x", env)).toBeNull();
    expect(usuarioPanel(basic("patricia", "clave-1"), {})).toBeNull();
  });
  it("cron: solo con Bearer <CRON_SECRET>, y nunca si no está configurado", () => {
    expect(esCron("Bearer secreto-cron", env)).toBe(true);
    expect(esCron("Bearer otro", env)).toBe(false);
    expect(esCron("Bearer ", {})).toBe(false);
  });
});

describe("mensaje de alerta sin tarjeta publicable", () => {
  it("sale sin 'Qué hacer' pero con las palabras del boletín", () => {
    const aviso = AvisoGemini.parse({
      encontrado: true, zona: "Altiplano Central", estacion: "Oruro-Ciudad", periodo_inicio: "2026-11-14", periodo_fin: "2026-11-23",
      fenomeno: "helada", temp_minima_c: 1, cita_evento: "Helada puntual y mínimas cercanas al punto de congelación",
      cita_riesgo: "Riesgo MEDIO por helada tardía", riesgo_helada: "medio", nivel_senamhi: null, confianza: 0.95,
    });
    const m = construirMensajeAlerta({ aviso, tarjeta: null, boletinEsEjemplo: false });
    expect(m).toContain('El Senamhi dice: "Helada puntual');
    expect(m).toContain("14 al 23 de noviembre de 2026");
    expect(m).not.toContain("QUÉ HACER");
    expect(m).not.toContain("voz sintética"); // sin audio no se declara voz
  });
});
