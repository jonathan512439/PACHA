// Validación de fotos (aporte de B, rama frontend): formato real por sus primeros bytes y RECHAZO de fotos con EXIF
// (ubicación GPS del celular), para que la privacidad no dependa de que el navegador limpie bien la imagen.
import { Buffer } from "node:buffer";

export type TipoFoto = "image/jpeg" | "image/png" | "image/webp";
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

function tipoFoto(bytes: Buffer): TipoFoto | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function tieneExif(bytes: Buffer, mime: TipoFoto): boolean {
  if (mime === "image/jpeg") {
    let offset = 2;
    while (offset < bytes.length) {
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) return false;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) throw new Error("JPEG incompleto.");
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) throw new Error("JPEG inválido.");
      if (
        marker === 0xe1 &&
        bytes.subarray(offset + 2, offset + 8).toString("binary") === "Exif\u0000\u0000"
      ) {
        return true;
      }
      offset += length;
    }
    return false;
  }

  if (mime === "image/png") {
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      if (offset + 12 + length > bytes.length) throw new Error("PNG inválido.");
      const tipo = bytes.toString("ascii", offset + 4, offset + 8);
      if (tipo === "eXIf") return true;
      offset += 12 + length;
      if (tipo === "IEND") return false;
    }
    throw new Error("PNG incompleto.");
  }

  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("WebP inválido.");
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const tipo = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + length > bytes.length) throw new Error("WebP incompleto.");
    if (tipo === "EXIF") return true;
    offset += 8 + length + (length % 2);
  }
  return false;
}

export function validarFoto(bytes: Buffer, nombre: string): TipoFoto {
  if (!bytes.length || bytes.length > MAX_FOTO_BYTES) {
    throw new Error(`${nombre} está vacío o supera el límite de 5 MB.`);
  }
  const mime = tipoFoto(bytes);
  if (!mime) throw new Error(`${nombre} no es una imagen JPEG, PNG o WebP válida.`);
  if (tieneExif(bytes, mime)) throw new Error(`${nombre} contiene metadatos EXIF; elimínalos antes de usarlo.`);
  return mime;
}
