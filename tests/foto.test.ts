import { describe, expect, it } from "vitest";
import { validarFoto } from "@/lib/storage/foto";

// JPEG mínimos: SOI (FFD8) + segmentos + SOS (FFDA)
const jpeg = (...segmentos: number[][]) => Buffer.from([0xff, 0xd8, ...segmentos.flat(), 0xff, 0xda, 0x00, 0x02]);
const app1Exif = [0xff, 0xe1, 0x00, 0x08, ...Buffer.from("Exif\0\0")];
const app0Jfif = [0xff, 0xe0, 0x00, 0x07, ...Buffer.from("JFIF\0")];

describe("validación de fotos de entregas (aporte de B)", () => {
  it("acepta un JPEG sin EXIF", () => expect(validarFoto(jpeg(app0Jfif), "foto")).toBe("image/jpeg"));
  it("rechaza un JPEG con EXIF (ubicación GPS del celular)", () => expect(() => validarFoto(jpeg(app1Exif), "foto")).toThrow(/EXIF/));
  it("rechaza lo que no es imagen aunque diga .jpg", () => expect(() => validarFoto(Buffer.from("%PDF-1.7 hola"), "foto")).toThrow(/no es una imagen/));
  it("rechaza archivos vacíos", () => expect(() => validarFoto(Buffer.alloc(0), "foto")).toThrow(/vacío/));
  it("acepta un WebP sin EXIF (lo que genera el panel con canvas)", () => {
    const vp8 = Buffer.concat([Buffer.from("VP8 "), Buffer.from([4, 0, 0, 0]), Buffer.alloc(4)]);
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([vp8.length + 4, 0, 0, 0]), Buffer.from("WEBP"), vp8]);
    expect(validarFoto(webp, "foto")).toBe("image/webp");
  });
});
