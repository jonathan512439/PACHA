import { describe, expect, it } from "vitest";
import { agruparProblemas, type FilaReporteProblema } from "@/lib/problemas-agrupar";

const fila = (o: Partial<FilaReporteProblema>): FilaReporteProblema => ({
  community_id: "c1", comunidad: "Kantuta Pampa", familiasComunidad: 50, factor: "pozo_o_vertiente_seca",
  confirmed_at: "2026-11-21T10:00:00Z", created_at: "2026-11-21T09:00:00Z", familias: 40, dias: 6, ...o,
});

describe("agruparProblemas (panel)", () => {
  it("agrupa por factor, una fila por comunidad con sus máximos, y ordena por cantidad de comunidades", () => {
    const p = agruparProblemas([
      fila({}),
      fila({ dias: 8, familias: 30, confirmed_at: "2026-11-20T10:00:00Z" }), // misma comunidad: máximos y fecha más antigua
      fila({ community_id: "c2", comunidad: "Sora Sora", familias: null, familiasComunidad: 22, dias: null }),
      fila({ community_id: "c3", comunidad: "Wila Qullu", factor: "sin_reserva_forraje", familias: 38, dias: 4 }),
      fila({ community_id: "c4", comunidad: "Chiru", factor: null, familias: 10, dias: null }),
    ]);
    expect(p.map((x) => x.factor)).toEqual(["pozo_o_vertiente_seca", "sin_reserva_forraje", "otro"]);
    const agua = p[0];
    expect(agua.etiqueta).toBe("Pozo o vertiente seca");
    expect(agua.comunidades).toHaveLength(2);
    expect(agua.comunidades[0]).toMatchObject({ id: "c1", familias: 40, dias: 8, desde: "2026-11-20T10:00:00Z" });
    expect(agua.familias).toBe(40 + 22); // sin dato en el reporte: familias de la comunidad
    expect(agua.maxDias).toBe(8);
    expect(agua.desde).toBe("2026-11-20T10:00:00Z");
    expect(p[2].etiqueta).toBe("Otros problemas");
    expect(p[2].maxDias).toBeNull();
  });

  it("sin reportes no hay problemas", () => expect(agruparProblemas([])).toEqual([]));
});
