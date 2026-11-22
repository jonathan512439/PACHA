// Sesión del panel: cookie firmada con HMAC-SHA256 (SESSION_SECRET), contraseñas con scrypt y roles.
// Lógica PURA (node:crypto, sin next/headers): la usan proxy.ts, las Server Actions, las rutas /api y las pruebas.
// En Next 16 el proxy corre en Node.js, así que node:crypto sirve en todos lados.
//
//   SESSION_SECRET = 64 caracteres hex (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
//   PANEL_USERS    = "patricia:tecnico:scrypt.<sal>.<hash>,jhonatan:admin:scrypt.<sal>.<hash>"
//                    (las líneas las imprime `npm run panel:usuario -- <usuario> <rol>`)
//
// Compatibilidad: SIN SESSION_SECRET el panel sigue con basic auth y PANEL_USERS "usuario:clave"
// (todos con rol admin, como antes), para no dejarlo inaccesible mientras se configura Vercel.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

type Entorno = Record<string, string | undefined>;

export const ROLES = ["tecnico", "admin"] as const;
export type Rol = (typeof ROLES)[number];

export const COOKIE_SESION = "pacha_sesion";
export const DURACION_SESION_S = 8 * 60 * 60; // 8 h
export const SECRETO_MIN = 32;

export type Sesion = { usuario: string; rol: Rol; exp: number }; // exp en segundos (epoch)

/* ---------------------------------------------------------------------------
 * Modo: sesión (cookie firmada) si hay SESSION_SECRET suficiente; si no, basic auth (compatibilidad).
 * ------------------------------------------------------------------------- */
export function secretoSesion(env: Entorno = process.env): string | null {
  const s = env.SESSION_SECRET?.trim();
  return s && s.length >= SECRETO_MIN ? s : null;
}
export const modoSesion = (env: Entorno = process.env) => secretoSesion(env) !== null;

/** admin puede todo; tecnico, solo lo de tecnico. */
export const rolAlcanza = (tiene: Rol, pide: Rol) => tiene === "admin" || pide === "tecnico";

/* ---------------------------------------------------------------------------
 * Contraseñas: scrypt (N=2^14, r=8, p=1, 32 bytes) con sal aleatoria de 16 bytes.
 * Formato "scrypt.<sal base64url>.<hash base64url>": sin ":", "," ni "$" (dotenv expande "$").
 * ------------------------------------------------------------------------- */
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const LARGO_HASH = 32;

export function hashClave(clave: string, sal: Buffer = randomBytes(16)): string {
  const h = scryptSync(clave.normalize("NFC"), sal, LARGO_HASH, SCRYPT);
  return `scrypt.${sal.toString("base64url")}.${h.toString("base64url")}`;
}

export function claveCorrecta(clave: string, guardado: string): boolean {
  const [tipo, salB64, hashB64, ...resto] = guardado.split(".");
  if (tipo !== "scrypt" || !salB64 || !hashB64 || resto.length) return false;
  const esperado = Buffer.from(hashB64, "base64url");
  if (esperado.length !== LARGO_HASH) return false;
  const h = scryptSync(clave.normalize("NFC"), Buffer.from(salB64, "base64url"), LARGO_HASH, SCRYPT);
  return timingSafeEqual(h, esperado);
}

/* ---------------------------------------------------------------------------
 * PANEL_USERS
 * ------------------------------------------------------------------------- */
export type UsuarioPanel = { usuario: string; rol: Rol; hash: string };

/** Usuarios con contraseña scrypt ("usuario:rol:hash"). Las entradas viejas "usuario:clave" se ignoran aquí. */
export function usuariosConHash(env: Entorno = process.env): Map<string, UsuarioPanel> {
  const mapa = new Map<string, UsuarioPanel>();
  for (const entrada of (env.PANEL_USERS ?? "").split(",")) {
    const partes = entrada.trim().split(":");
    if (partes.length !== 3) continue;
    const [usuario, rol, hash] = partes.map((p) => p.trim());
    if (!usuario || !(ROLES as readonly string[]).includes(rol) || !hash.startsWith("scrypt.")) continue;
    mapa.set(usuario, { usuario, rol: rol as Rol, hash });
  }
  return mapa;
}

export const nombreValido = (u: string) => /^[a-z0-9_.-]{2,32}$/i.test(u);

/** Hash fijo para gastar el mismo tiempo cuando el usuario no existe (no revela qué usuarios hay). */
let hashSenuelo: string | null = null;

/** Comprueba usuario y contraseña. Devuelve el usuario con su rol, o null. */
export function autenticar(usuario: string, clave: string, env: Entorno = process.env): Omit<UsuarioPanel, "hash"> | null {
  const u = usuariosConHash(env).get(usuario);
  if (!u) {
    hashSenuelo ??= hashClave("senuelo");
    claveCorrecta(clave, hashSenuelo);
    return null;
  }
  return claveCorrecta(clave, u.hash) ? { usuario: u.usuario, rol: u.rol } : null;
}

/* ---------------------------------------------------------------------------
 * Token de sesión: base64url(JSON {u, r, exp}) + "." + base64url(HMAC-SHA256)
 * ------------------------------------------------------------------------- */
const firmar = (datos: string, secreto: string) => createHmac("sha256", secreto).update(datos).digest("base64url");

export function crearToken(
  s: { usuario: string; rol: Rol },
  secreto: string,
  ahoraS: number = Math.floor(Date.now() / 1000),
): { token: string; sesion: Sesion } {
  const sesion: Sesion = { usuario: s.usuario, rol: s.rol, exp: ahoraS + DURACION_SESION_S };
  const datos = Buffer.from(JSON.stringify({ u: sesion.usuario, r: sesion.rol, exp: sesion.exp })).toString("base64url");
  return { token: `${datos}.${firmar(datos, secreto)}`, sesion };
}

/**
 * Valida firma, forma y vencimiento. Devuelve la sesión o null.
 * Con `env`, además exige que el usuario siga en PANEL_USERS con el mismo rol (quitarlo cierra su sesión).
 */
export function leerToken(
  token: string | undefined | null,
  secreto: string,
  opciones: { ahoraS?: number; env?: Entorno } = {},
): Sesion | null {
  if (!token) return null;
  const [datos, firma, ...resto] = token.split(".");
  if (!datos || !firma || resto.length) return null;
  const esperada = Buffer.from(firmar(datos, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  let crudo: unknown;
  try {
    crudo = JSON.parse(Buffer.from(datos, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const { u, r, exp } = (crudo ?? {}) as { u?: unknown; r?: unknown; exp?: unknown };
  if (typeof u !== "string" || typeof exp !== "number" || !(ROLES as readonly unknown[]).includes(r)) return null;
  const ahora = opciones.ahoraS ?? Math.floor(Date.now() / 1000);
  if (exp <= ahora) return null;
  if (opciones.env) {
    const actual = usuariosConHash(opciones.env).get(u);
    if (!actual || actual.rol !== r) return null;
  }
  return { usuario: u, rol: r as Rol, exp };
}

/** Opciones de la cookie de sesión (HttpOnly, Secure, SameSite=Lax, 8 h). */
export const opcionesCookie = (maxAge: number = DURACION_SESION_S) => ({
  httpOnly: true,
  secure: true, // los navegadores aceptan cookies Secure en http://localhost
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/* ---------------------------------------------------------------------------
 * Bloqueo por intentos: 5 fallos en 10 min por usuario + IP → espera de 10 min.
 * En memoria de la instancia (Vercel reutiliza instancias; no es un registro global).
 * ------------------------------------------------------------------------- */
export const INTENTOS_MAX = 5;
export const VENTANA_MS = 10 * 60 * 1000;
export const BLOQUEO_MS = 10 * 60 * 1000;

type Registro = { fallos: number[]; bloqueadoHasta: number };

export class ControlIntentos {
  private registros = new Map<string, Registro>();

  private clave = (usuario: string, ip: string) => `${usuario.toLowerCase()}|${ip}`;

  /** ms que faltan para poder intentar de nuevo (0 = puede intentar). */
  esperaRestante(usuario: string, ip: string, ahora = Date.now()): number {
    const r = this.registros.get(this.clave(usuario, ip));
    return r && r.bloqueadoHasta > ahora ? r.bloqueadoHasta - ahora : 0;
  }

  /** Anota un fallo. Devuelve true si con este fallo quedó bloqueado. */
  fallo(usuario: string, ip: string, ahora = Date.now()): boolean {
    const k = this.clave(usuario, ip);
    const r = this.registros.get(k) ?? { fallos: [], bloqueadoHasta: 0 };
    r.fallos = [...r.fallos.filter((t) => ahora - t < VENTANA_MS), ahora];
    if (r.fallos.length >= INTENTOS_MAX) {
      r.bloqueadoHasta = ahora + BLOQUEO_MS;
      r.fallos = [];
    }
    this.registros.set(k, r);
    if (this.registros.size > 5000) this.limpiar(ahora);
    return r.bloqueadoHasta > ahora;
  }

  exito(usuario: string, ip: string) {
    this.registros.delete(this.clave(usuario, ip));
  }

  private limpiar(ahora: number) {
    for (const [k, r] of this.registros) {
      if (r.bloqueadoHasta <= ahora && r.fallos.every((t) => ahora - t >= VENTANA_MS)) this.registros.delete(k);
    }
  }
}

/** Ruta interna segura para volver después de ingresar (evita redirecciones abiertas). */
export function rutaSiguiente(valor: unknown): string {
  const s = typeof valor === "string" ? valor : "";
  return /^\/panel(?:[/?#]|$)/.test(s) && !s.includes("\\") && !s.includes("//") ? s : "/panel";
}
