import { describe, expect, it } from "vitest";
import {
  lineaDeTiempo,
  textoCompartir,
  textoContador,
  textoHoras,
  tiemposRespuesta,
  textoEntrega,
  visibilidadComunidad,
  visibilidadPorComunidad,
  type EntregaVis,
  type ReporteVis,
} from "@/lib/visibilidad-calculo";

const ahora = new Date("2026-11-22T12:00:00Z");
const rep = (o: Partial<ReporteVis> = {}): ReporteVis => ({
  id: "r1", community_id: "c1", type: "agua", factor: "pozo_o_vertiente_seca", status: "confirmado",
  created_at: "2026-11-20T10:00:00Z", confirmed_at: "2026-11-20T10:05:00Z", dias: 4, familias: 40, ...o,
});
const ent = (o: Partial<EntregaVis> = {}): EntregaVis => ({
  id: "e1", community_id: "c1", report_id: "r1", kind: "cisterna", quantity: 2, unit: "cisternas",
  delivered_at: "2026-11-21T09:00:00Z", confirmed_by_community: null, confirmed_at: null, is_example: true, ...o,
});

describe("«Sin agua, a la vista»", () => {
  it("el contador suma los días que dijo la comunidad y los que pasaron desde el reporte", () => {
    const v = visibilidadComunidad([rep()], [], ahora);
    expect(v.sinAgua).toMatchObject({ recurso: "agua", dias: 4 + 2, minimo: false, familias: 40 });
    expect(v.sinForraje).toBeNull();
    expect(v.problemas).toEqual(["agua"]);
    expect(v.sinEntrega).toBe(true);
    expect(textoContador(v.sinAgua!)).toBe("6 días sin agua");
  });

  it("si no dijo cuántos días, el número es «al menos»", () => {
    const v = visibilidadComunidad([rep({ dias: null })], [], ahora);
    expect(textoContador(v.sinAgua!)).toBe("al menos 2 días sin agua");
  });

  it("sigue contando con la entrega registrada hasta que la comunidad confirma que llegó", () => {
    const atendido = rep({ status: "atendido" });
    const sinRespuesta = visibilidadComunidad([atendido], [ent()], ahora);
    expect(sinRespuesta.sinAgua?.dias).toBe(6);
    expect(sinRespuesta.sinEntrega).toBe(false);
    expect(visibilidadComunidad([atendido], [ent({ confirmed_by_community: false })], ahora).sinAgua?.dias).toBe(6);
    const llego = visibilidadComunidad([atendido], [ent({ confirmed_by_community: true })], ahora);
    expect(llego.sinAgua).toBeNull();
    expect(llego.problemas).toEqual([]);
    expect(llego.ultimaEntrega?.id).toBe("e1");
  });

  it("una entrega confirmada sin reporte asociado solo resuelve los reportes anteriores a ella", () => {
    const viejo = rep({ id: "r1", created_at: "2026-11-19T10:00:00Z" });
    const nuevo = rep({ id: "r2", type: "forraje", created_at: "2026-11-21T15:00:00Z", dias: 1 });
    const v = visibilidadComunidad([viejo, nuevo], [ent({ report_id: null, confirmed_by_community: true })], ahora);
    expect(v.sinAgua).toBeNull();
    expect(v.sinForraje).toMatchObject({ dias: 1 + 0 });
    expect(v.sinEntrega).toBe(true); // la entrega fue antes del reporte de forraje
  });

  it("los reportes por confirmar, en revisión o descartados no cuentan", () => {
    const v = visibilidadComunidad([rep({ status: "por_confirmar" }), rep({ id: "r2", status: "descartado" })], [], ahora);
    expect(v).toMatchObject({ sinAgua: null, problemas: [], sinEntrega: false });
  });

  it("agrupa por comunidad", () => {
    const m = visibilidadPorComunidad([rep(), rep({ id: "r9", community_id: "c2", type: "dano", factor: "camino_cortado" })], [], ahora);
    expect(m.get("c1")?.sinAgua?.dias).toBe(6);
    expect(m.get("c2")).toMatchObject({ sinAgua: null, problemas: ["dano"], factor: "camino_cortado" });
  });

  it("describe la entrega en palabras", () => {
    expect(textoEntrega({ kind: "cisterna", quantity: 1, unit: "cisternas" })).toBe("1 cisterna de agua");
    expect(textoEntrega({ kind: "forraje", quantity: 1500, unit: "kg" })).toBe("1.500 kg de forraje");
  });
});

describe("ficha pública: línea de tiempo, tiempos y texto para compartir", () => {
  it("ordena los hechos y no incluye nada personal", () => {
    const ev = lineaDeTiempo(
      [rep()],
      [ent({ confirmed_by_community: true, confirmed_at: "2026-11-21T18:00:00Z" })],
      (f) => (f === "pozo_o_vertiente_seca" ? "Pozo o vertiente seca" : f),
    );
    expect(ev.map((e) => e.tipo)).toEqual(["reporto", "confirmo", "entrega", "respuesta"]);
    expect(ev[0].texto).toBe("La comunidad reportó falta de agua (pozo o vertiente seca · 4 días sin recurso · 40 familias).");
    expect(ev[2].texto).toBe("Entrega registrada: 2 cisternas de agua.");
    expect(ev[3]).toMatchObject({ llego: true });
  });

  it("mide el tiempo de respuesta solo con entregas enlazadas a su reporte", () => {
    const t = tiemposRespuesta([rep()], [ent({ confirmed_by_community: false, confirmed_at: "2026-11-21T12:00:00Z" }), ent({ id: "e2", report_id: null })]);
    expect(t).toEqual({ reporteAEntrega: 23, entregaARespuesta: 3, entregasMedidas: 1 });
    expect(textoHoras(23)).toBe("23 h");
    expect(textoHoras(75)).toBe("3 días y 3 h");
    expect(tiemposRespuesta([], []).reporteAEntrega).toBeNull();
  });

  it("el texto para compartir describe hechos confirmados y marca lo de ejemplo", () => {
    const vis = visibilidadComunidad([rep()], [], ahora);
    expect(textoCompartir({ nombre: "Kantuta Pampa", ejemplo: true, vis, url: "https://x/c/1" })).toBe(
      "[EJEMPLO] Kantuta Pampa lleva 6 días sin agua (40 familias). Sin entrega todavía. Datos confirmados por la comunidad: https://x/c/1",
    );
    expect(textoCompartir({ nombre: "Sora", ejemplo: false, vis: visibilidadComunidad([], [], ahora), url: "u" })).toBe(
      "Sora: ficha pública con sus reportes y entregas. u",
    );
  });
});
