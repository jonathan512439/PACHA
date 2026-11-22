// Login del panel: firma, vencimiento, rol, contraseña incorrecta, bloqueo y compatibilidad con basic auth.
import { describe, expect, it } from "vitest";
import { accesoDeHeaders, leerCookie } from "@/lib/panel-auth";
import {
  BLOQUEO_MS,
  COOKIE_SESION,
  ControlIntentos,
  DURACION_SESION_S,
  INTENTOS_MAX,
  autenticar,
  claveCorrecta,
  crearToken,
  hashClave,
  leerToken,
  modoSesion,
  opcionesCookie,
  rolAlcanza,
  rutaSiguiente,
  usuariosConHash,
} from "@/lib/sesion";

const SECRETO = "a".repeat(64);
const HASH_ANA = hashClave("clave-de-ana-123");
const HASH_JHON = hashClave("clave-de-jhon-456");
const ENV = { SESSION_SECRET: SECRETO, PANEL_USERS: `ana:tecnico:${HASH_ANA}, jhonatan:admin:${HASH_JHON}` };
const AHORA = 1_800_000_000;

describe("contraseñas (scrypt)", () => {
  it("el hash tiene sal: dos hashes de la misma clave son distintos y ambos validan", () => {
    const otro = hashClave("clave-de-ana-123");
    expect(otro).not.toBe(HASH_ANA);
    expect(claveCorrecta("clave-de-ana-123", HASH_ANA)).toBe(true);
    expect(claveCorrecta("clave-de-ana-123", otro)).toBe(true);
  });

  it("no lleva caracteres que rompan PANEL_USERS ni dotenv", () => {
    expect(HASH_ANA).toMatch(/^scrypt\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("contraseña incorrecta, usuario inexistente o hash dañado → null", () => {
    expect(autenticar("ana", "otra-clave", ENV)).toBeNull();
    expect(autenticar("nadie", "clave-de-ana-123", ENV)).toBeNull();
    expect(claveCorrecta("x", "scrypt.roto")).toBe(false);
    expect(autenticar("ana", "clave-de-ana-123", ENV)).toEqual({ usuario: "ana", rol: "tecnico" });
    expect(autenticar("jhonatan", "clave-de-jhon-456", ENV)).toEqual({ usuario: "jhonatan", rol: "admin" });
  });

  it("PANEL_USERS ignora entradas viejas 'usuario:clave' y roles desconocidos", () => {
    const u = usuariosConHash({ PANEL_USERS: `vieja:clave,mala:jefe:${HASH_ANA},ana:tecnico:${HASH_ANA}` });
    expect([...u.keys()]).toEqual(["ana"]);
  });
});

describe("token de sesión (HMAC)", () => {
  const { token, sesion } = crearToken({ usuario: "ana", rol: "tecnico" }, SECRETO, AHORA);

  it("vale 8 horas", () => {
    expect(sesion.exp - AHORA).toBe(DURACION_SESION_S);
    expect(leerToken(token, SECRETO, { ahoraS: AHORA + DURACION_SESION_S - 1 })?.usuario).toBe("ana");
    expect(leerToken(token, SECRETO, { ahoraS: AHORA + DURACION_SESION_S })).toBeNull();
  });

  it("rechaza otra firma, otro secreto o datos cambiados", () => {
    expect(leerToken(token, "b".repeat(64), { ahoraS: AHORA })).toBeNull();
    const [datos, firma] = token.split(".");
    const admin = Buffer.from(JSON.stringify({ u: "ana", r: "admin", exp: sesion.exp })).toString("base64url");
    expect(leerToken(`${admin}.${firma}`, SECRETO, { ahoraS: AHORA })).toBeNull();
    expect(leerToken(`${datos}.${firma}x`, SECRETO, { ahoraS: AHORA })).toBeNull();
    expect(leerToken("basura", SECRETO, { ahoraS: AHORA })).toBeNull();
    expect(leerToken(null, SECRETO)).toBeNull();
  });

  it("si quitan al usuario de PANEL_USERS o le cambian el rol, su sesión deja de valer", () => {
    expect(leerToken(token, SECRETO, { ahoraS: AHORA, env: ENV })?.rol).toBe("tecnico");
    expect(leerToken(token, SECRETO, { ahoraS: AHORA, env: { PANEL_USERS: `jhonatan:admin:${HASH_JHON}` } })).toBeNull();
    expect(leerToken(token, SECRETO, { ahoraS: AHORA, env: { PANEL_USERS: `ana:admin:${HASH_ANA}` } })).toBeNull();
  });

  it("cookie HttpOnly, Secure, SameSite=Lax y 8 h", () => {
    expect(opcionesCookie()).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: DURACION_SESION_S });
  });
});

describe("roles", () => {
  it("admin puede todo; técnico no puede lo de admin", () => {
    expect(rolAlcanza("admin", "admin")).toBe(true);
    expect(rolAlcanza("admin", "tecnico")).toBe(true);
    expect(rolAlcanza("tecnico", "tecnico")).toBe(true);
    expect(rolAlcanza("tecnico", "admin")).toBe(false);
  });
});

describe("bloqueo por intentos", () => {
  it(`${INTENTOS_MAX} fallos en 10 min → 10 min de espera; después vuelve a dejar intentar`, () => {
    const c = new ControlIntentos();
    const t0 = 1_000_000;
    for (let i = 0; i < INTENTOS_MAX - 1; i++) expect(c.fallo("ana", "1.1.1.1", t0 + i)).toBe(false);
    expect(c.esperaRestante("ana", "1.1.1.1", t0 + 10)).toBe(0);
    expect(c.fallo("ana", "1.1.1.1", t0 + 10)).toBe(true);
    expect(c.esperaRestante("ana", "1.1.1.1", t0 + 20)).toBeGreaterThan(0);
    expect(c.esperaRestante("ana", "2.2.2.2", t0 + 20)).toBe(0); // otra IP no queda bloqueada
    expect(c.esperaRestante("ana", "1.1.1.1", t0 + 10 + BLOQUEO_MS)).toBe(0);
  });

  it("fallos espaciados más de 10 min no se acumulan; un acierto reinicia la cuenta", () => {
    const c = new ControlIntentos();
    for (let i = 0; i < INTENTOS_MAX + 2; i++) expect(c.fallo("ana", "ip", i * 11 * 60_000)).toBe(false);
    c.fallo("jhon", "ip", 0);
    c.exito("jhon", "ip");
    for (let i = 0; i < INTENTOS_MAX - 1; i++) expect(c.fallo("jhon", "ip", 1 + i)).toBe(false);
  });
});

describe("modo y compatibilidad", () => {
  const { token } = crearToken({ usuario: "jhonatan", rol: "admin" }, SECRETO);

  it("con SESSION_SECRET vale la cookie (y no el basic auth)", () => {
    expect(modoSesion(ENV)).toBe(true);
    const cookie = `otra=1; ${COOKIE_SESION}=${token}`;
    expect(accesoDeHeaders({ cookie, authorization: null }, ENV)).toEqual({ usuario: "jhonatan", rol: "admin" });
    const basic = `Basic ${Buffer.from("vieja:clave").toString("base64")}`;
    expect(accesoDeHeaders({ cookie: null, authorization: basic }, { ...ENV, PANEL_USERS: `${ENV.PANEL_USERS},vieja:clave` })).toBeNull();
  });

  it("sin SESSION_SECRET sigue el basic auth de antes, con rol admin", () => {
    const env = { PANEL_USERS: "patricia:clave1" };
    expect(modoSesion(env)).toBe(false);
    expect(modoSesion({ SESSION_SECRET: "corto" })).toBe(false);
    const basic = `Basic ${Buffer.from("patricia:clave1").toString("base64")}`;
    expect(accesoDeHeaders({ cookie: null, authorization: basic }, env)).toEqual({ usuario: "patricia", rol: "admin" });
    expect(accesoDeHeaders({ cookie: `${COOKIE_SESION}=${token}`, authorization: null }, env)).toBeNull();
  });

  it("leerCookie encuentra la cookie entre varias", () => {
    expect(leerCookie("a=1; pacha_sesion=xyz; b=2", "pacha_sesion")).toBe("xyz");
    expect(leerCookie(null, "pacha_sesion")).toBeNull();
  });

  it("rutaSiguiente solo deja volver al panel (sin redirecciones abiertas)", () => {
    expect(rutaSiguiente("/panel/alertas?x=1")).toBe("/panel/alertas?x=1");
    expect(rutaSiguiente("https://malo.example")).toBe("/panel");
    expect(rutaSiguiente("//malo.example/panel")).toBe("/panel");
    expect(rutaSiguiente("/panelito")).toBe("/panel");
    expect(rutaSiguiente(null)).toBe("/panel");
  });
});
