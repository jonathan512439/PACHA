import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

type CuentaPanel = { usuario: string; clave: string };

function hash(valor: string) {
  return createHash("sha256").update(valor, "utf8").digest();
}

function iguales(a: string, b: string) {
  return timingSafeEqual(hash(a), hash(b));
}

function cuentasPanel(): CuentaPanel[] | null {
  const valor = process.env.PANEL_USERS;
  if (!valor) return null;

  const cuentas = valor.split(",").map((entrada) => {
    const separador = entrada.indexOf(":");
    if (separador < 1 || separador === entrada.length - 1) return null;
    return {
      usuario: entrada.slice(0, separador).trim(),
      clave: entrada.slice(separador + 1),
    };
  });
  if (cuentas.some((cuenta) => !cuenta || !cuenta.usuario || !cuenta.clave)) return null;
  return cuentas.filter((cuenta): cuenta is CuentaPanel => cuenta !== null);
}

function credenciales(request: NextRequest): CuentaPanel | null {
  const autorizacion = request.headers.get("authorization") ?? "";
  const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(autorizacion);
  if (!match) return null;

  const bytes = Buffer.from(match[1], "base64");
  if (bytes.toString("base64").replace(/=+$/, "") !== match[1].replace(/=+$/, "")) return null;
  const decoded = bytes.toString("utf8");
  const separador = decoded.indexOf(":");
  if (separador < 1) return null;
  return { usuario: decoded.slice(0, separador), clave: decoded.slice(separador + 1) };
}

function respuestaNoAutorizada(esApi: boolean) {
  return new NextResponse(
    esApi
      ? JSON.stringify({ error: "Autenticación requerida." })
      : "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><title>Autenticación requerida</title><body><h1>Autenticación requerida</h1></body></html>",
    {
      status: 401,
      headers: {
        "Content-Type": esApi ? "application/json; charset=utf-8" : "text/html; charset=utf-8",
        "WWW-Authenticate": 'Basic realm="PACHA panel", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    },
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esApi = pathname.startsWith("/api/");
  const autorizacion = request.headers.get("authorization") ?? "";

  if (
    pathname === "/api/boletin/buscar" &&
    process.env.CRON_SECRET &&
    autorizacion.startsWith("Bearer ") &&
    iguales(autorizacion.slice("Bearer ".length), process.env.CRON_SECRET)
  ) {
    return NextResponse.next();
  }

  const cuentas = cuentasPanel();
  if (!cuentas) {
    console.error("PANEL_USERS no está definido o tiene un formato inválido.");
    return new NextResponse("El panel no está configurado.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const presentada = credenciales(request);
  const cuenta = presentada
    ? cuentas.find(
        (candidata) =>
          iguales(candidata.usuario, presentada.usuario) &&
          iguales(candidata.clave, presentada.clave),
      )
    : undefined;
  if (!cuenta) return respuestaNoAutorizada(esApi);

  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("x-panel-user");
  headers.set("x-panel-user", cuenta.usuario);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/api/panel/:path*",
    "/api/demo/:path*",
    "/api/alertas/:path*",
    "/api/boletin/:path*",
    "/api/entregas",
  ],
};
