import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const accesoActual = vi.fn();
vi.mock("@/lib/acceso-panel", () => ({ accesoActual: () => accesoActual() }));

const { AccesoPanel } = await import("@/components/ui/Cabecera");
const html = async () => renderToStaticMarkup(await AccesoPanel());

describe("cabecera: acceso al panel", () => {
  beforeEach(() => accesoActual.mockReset());

  it("sin sesión dice «Ingresar»", async () => {
    accesoActual.mockResolvedValue(null);
    expect(await html()).toContain(">Ingresar<");
  });

  it("con sesión dice «Panel técnico» (no «Ingresar»)", async () => {
    accesoActual.mockResolvedValue({ usuario: "ana", rol: "tecnico" });
    const h = await html();
    expect(h).toContain(">Panel técnico<");
    expect(h).not.toContain("Ingresar");
  });

});
