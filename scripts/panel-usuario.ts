// Crea la línea de un usuario del panel para PANEL_USERS (contraseña con scrypt; nunca en texto plano).
//   npm run panel:usuario -- <usuario> <tecnico|editor|verificador|admin>
// Pide la contraseña dos veces SIN mostrarla e imprime "usuario:rol:scrypt.<sal>.<hash>".
// Varias líneas se juntan con comas: PANEL_USERS=ana:tecnico:scrypt...,jhonatan:admin:scrypt...
// Sin terminal (p. ej. en CI) lee la contraseña de la primera línea de la entrada estándar.
import { ROLES, hashClave, nombreValido, type Rol } from "@/lib/sesion";
import { falla } from "./_comun";

const CLAVE_MIN = 10;

function leerOculto(pregunta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;
    process.stdout.write(pregunta);
    if (!entrada.isTTY) {
      let datos = "";
      entrada.setEncoding("utf8");
      entrada.on("data", (d) => (datos += d));
      entrada.on("end", () => { process.stdout.write("\n"); resolve(datos.split(/\r?\n/)[0] ?? ""); });
      entrada.on("error", reject);
      return;
    }
    let clave = "";
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");
    const alTeclear = (tecla: string) => {
      for (const c of tecla) {
        if (c === "\r" || c === "\n") {
          entrada.setRawMode(false);
          entrada.pause();
          entrada.off("data", alTeclear);
          process.stdout.write("\n");
          resolve(clave);
          return;
        }
        if (c === "\u0003") { process.stdout.write("\n"); process.exit(130); } // Ctrl+C
        if (c === "\u007f" || c === "\b") clave = clave.slice(0, -1);
        else clave += c;
      }
    };
    entrada.on("data", alTeclear);
  });
}

async function main() {
  const [usuarioCrudo, rol] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const usuario = (usuarioCrudo ?? "").trim().toLowerCase();
  if (!usuario || !rol) falla("Uso: npm run panel:usuario -- <usuario> <tecnico|editor|verificador|admin>");
  if (!nombreValido(usuario)) falla("Usuario: de 2 a 32 caracteres, solo letras, números, punto, guion o guion bajo.");
  if (!(ROLES as readonly string[]).includes(rol)) falla(`Rol "${rol}" no válido. Usa: ${ROLES.join(" o ")}.`);

  const clave = await leerOculto(`Contraseña para ${usuario} (mín. ${CLAVE_MIN} caracteres, no se muestra): `);
  if (clave.length < CLAVE_MIN) falla(`La contraseña debe tener al menos ${CLAVE_MIN} caracteres.`);
  if (process.stdin.isTTY) {
    const otra = await leerOculto("Repite la contraseña: ");
    if (otra !== clave) falla("Las contraseñas no coinciden.");
  }

  console.log("\nAgrega esta línea a PANEL_USERS (separada por comas de las demás), en .env y en Vercel:\n");
  console.log(`${usuario}:${rol as Rol}:${hashClave(clave)}`);
  console.log("\nRecuerda: el login nuevo se activa cuando SESSION_SECRET está configurado.");
}

main().catch((e) => falla(e instanceof Error ? e.message : String(e)));
