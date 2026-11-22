import { describe, expect, it } from "vitest";
import { textoMisReportes } from "@/lib/bot/textos";

describe("Mi reporte (texto para la comunidad)", () => {
  it("muestra estado, prioridad con puesto y la entrega pendiente de confirmar", () => {
    const t = textoMisReportes([{
      comunidad: "Kantuta Pampa", tipo: "agua", status: "confirmado", creado: "2026-11-21T15:00:00Z",
      prioridad: { urgencia: "naranja", puesto: 2, total: 5 },
      entrega: { quantity: 1, unit: "cisternas", kind: "cisterna", delivered_at: "2026-11-22T14:00:00Z", confirmed_by_community: null },
    }], "https://ejemplo.test");
    expect(t).toContain("📋 Tu reporte");
    expect(t).toContain("Kantuta Pampa · sin agua · 21/11");
    expect(t).toContain("✅ Confirmado");
    expect(t).toContain("🟠 urgente · puesto 2 de 5");
    expect(t).toContain("Entrega: 1 cisterna el 22/11 · falta que confirmes si llegó");
    expect(t).toContain("Mapa público: https://ejemplo.test");
  });

  it("varios reportes se numeran; sin prioridad ni entrega no inventa líneas", () => {
    const base = { comunidad: "Sora Sora", tipo: "forraje", creado: "2026-11-20T12:00:00Z", prioridad: null, entrega: null };
    const t = textoMisReportes([{ ...base, status: "revisar" }, { ...base, status: "por_confirmar" }], "https://ejemplo.test");
    expect(t).toContain("1) Sora Sora · sin forraje");
    expect(t).toContain("2) Sora Sora");
    expect(t).toContain("👀 Una persona del municipio");
    expect(t).not.toContain("Prioridad:");
    expect(t).not.toContain("Entrega:");
  });
});
