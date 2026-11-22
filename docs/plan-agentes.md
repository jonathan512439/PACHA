# Trabajo en paralelo: 2 agentes (dom 22/11, desde ~03:00)

**Para:** Jhonatan y los dos agentes · **Plan base:** [`docs/plan-rediseno.md`](plan-rediseno.md) · **Congelado del código:** 10:30.

## Reparto en una línea
- **Agente INTERFAZ:** cómo se ve y se entiende. Rediseño, contraste, portada, mapa, páginas públicas, «Sin agua, a la vista» y el estilo del panel.
- **Agente SERVIDOR:** qué dice y quién puede hacer qué. Tarjetas v0.4 y fuentes, alerta alarmante con audio, login con roles, bot.

Cada uno trabaja en **su propia carpeta y rama**, sobre archivos distintos. Se juntan en `main`, que es lo que publica Vercel.

| | Agente INTERFAZ | Agente SERVIDOR |
|---|---|---|
| **Carpeta** | `D:\Jonathan\Desktop\SOFTWARE\Hackathon-interfaz` | `D:\Jonathan\Desktop\SOFTWARE\Hackathon-servidor` |
| **Rama** | `interfaz` | `servidor` |
| **Puerto de `next dev`** | `3001` (`npx next dev -p 3001`) | `3002` (`npx next dev -p 3002`) |
| **Estado para el otro** | `docs/estado-interfaz.md` | `docs/estado-servidor.md` |

## Dueño de cada archivo (para no chocar)
| Archivos | Dueño | El otro… |
|---|---|---|
| `app/globals.css`, `app/layout.tsx`, `app/page.tsx` | INTERFAZ | no toca |
| `app/tarjetas/**`, `app/entregas/**`, `app/probar/**`, `app/suscribirse/**` | INTERFAZ | no toca |
| `app/fuentes/**`, `app/comunidad/**`, `app/resumen/**` (nuevas) | INTERFAZ | no toca |
| `app/panel/page.tsx`, `app/panel/reportes/**`, `app/panel/alertas/**` (solo JSX y estilo) | INTERFAZ | no toca; si necesita un dato nuevo, lo pide en su archivo de estado |
| `components/**` (incluye `components/ui/**` nuevo, `tarjeta/`, `mapa/`, `panel/`, `probar/`) | INTERFAZ | solo **usa** `components/ui/*` |
| `lib/datos-publicos.ts`, `lib/visibilidad.ts` (nuevo), `public/**` | INTERFAZ | no toca |
| `contratos/**` (tipos, esquema, migraciones, prioridad) | SERVIDOR | solo **lee** |
| `lib/bot/**`, `lib/canales/**`, `lib/alertas.ts`, `lib/boletin.ts`, `lib/gemini.ts`, `lib/entregas.ts`, `lib/problemas*.ts` | SERVIDOR | no toca |
| `lib/tarjetas.ts`, `lib/tarjeta-publica.ts`, `lib/tarjeta-contenido.ts`, `lib/fuentes.ts` (nuevo) | SERVIDOR | solo **usa** |
| `proxy.ts`, `lib/panel-auth.ts`, `lib/sesion.ts` (nuevo), `app/ingresar/**`, `app/panel/layout.tsx`, `app/panel/acciones.ts` | SERVIDOR | no toca |
| `app/api/**`, `scripts/**`, `data/**`, `docs/prompts-imagenes.md` | SERVIDOR | no toca |
| `tests/**` | Cada uno, **sus** archivos | — |
| `package.json` | Cualquiera, solo para **agregar** una dependencia, y lo anota en su estado | — |
| `decisiones.md` | Cualquiera, **solo agregando** una sección propia al final, antes de "Pendientes" | si hay conflicto, se conservan las dos secciones |

## Cómo se juntan (siempre igual)
Al terminar cada bloque, no al final de la noche:
```
git fetch origin
git rebase origin/main
npm run typecheck && npm run lint && npm test && npx next build
git push origin HEAD:main
```
- Si el push se rechaza (el otro subió antes), se repite desde `git fetch`.
- **Nunca** `--force`, nunca `--no-verify`, nunca reescribir `main`.
- Si el rebase choca en un archivo del otro, se queda con la versión de `origin/main` para ese archivo y se avisa en el estado.
- Antes de cada push: `git diff origin/main --stat` para confirmar que no se tocó nada ajeno ni se subió un secreto.

## Entregas entre agentes (con hora límite)
| # | Qué | De → A | Hasta | Dónde se ve |
|---|---|---|---|---|
| H1 | **Tokens de color y componentes base** (`globals.css`, `components/ui/*`: Boton, Tarjeta, Insignia, Aviso, Cifra, Campo) | INTERFAZ → SERVIDOR | **04:00** | en `main` + `estado-interfaz.md` |
| H2 | **Tipo `Tarjeta` v0.4** (campos nuevos **opcionales**, para que las 6 actuales sigan valiendo) y **`lib/fuentes.ts`** con `data/fuentes.json` | SERVIDOR → INTERFAZ | **04:00** | en `main` + `estado-servidor.md` |
| H3 | **Formato de la alerta por nivel** (`nivelAlerta(aviso)` en `contratos/tipos.ts`: `roja` · `naranja`) para la banda de la portada | SERVIDOR → INTERFAZ | 04:30 | `main` |
| H4 | **Prompts de imágenes por paso** de las tarjetas nuevas | SERVIDOR → Jhonatan | 05:30 | `docs/prompts-imagenes.md` |
| H5 | **Hoja de verificación** de las tarjetas nuevas | SERVIDOR → Jhonatan / B | 05:30 | `scratch/verificacion/` (local) + aviso |
| H6 | **Imágenes de Higgsfield** | Jhonatan → INTERFAZ (portada, ciclo) y SERVIDOR (tarjetas) | cuando estén | `D:\Jonathan\Desktop\SOFTWARE\Hackathon\assets\higgsfield\lote2\` (carpeta original) |
| H7 | **Migraciones SQL** para aplicar | SERVIDOR → Jhonatan | cuando estén | `contratos/migraciones/` + aviso |

Mientras espera una entrega, cada agente sigue con otro bloque suyo: ninguno se queda parado.

**Ya listo antes de empezar (03:10):**
- migración `lesson_sends` aplicada;
- `SESSION_SECRET` en el `.env` de las 3 carpetas;
- **lote 2 de imágenes generado y revisado** en `D:\Jonathan\Desktop\SOFTWARE\Hackathon\assets\higgsfield\lote2\`, con sus carpetas:
  - `portada/`, `ciclo/`: de INTERFAZ;
  - `headers/` (encabezados de las 6 tarjetas nuevas), `tarjetas/sequia-antes_familia-01/paso2.webp` y `paso3.webp` (aprobadas): de SERVIDOR.

**Coordinación:** la sesión principal de Claude, en la carpeta `Hackathon`, orquesta.
- Revisa cada subida a `main` y los archivos de estado.
- Puede escribirte por mensaje: sigue sus indicaciones salvo que rompan una regla; en ese caso, dilo en tu estado.
- Si te bloqueas, escríbelo en tu archivo de estado con **BLOQUEADO:** al inicio de la línea.

---

## Prompt del Agente INTERFAZ (copiar y pegar en la sesión abierta en `Hackathon-interfaz`)

> Eres el **Agente INTERFAZ** de PACHA. Trabajas en `D:\Jonathan\Desktop\SOFTWARE\Hackathon-interfaz`, rama `interfaz`, con `next dev` en el puerto 3001. Hay otro agente (SERVIDOR) trabajando a la vez en otra carpeta.
>
> **Lee primero, en este orden:**
> 1. `AGENTS.md`: es Next 16. Antes de escribir código lee la guía que corresponda en `node_modules/next/dist/docs/`.
> 2. `docs/plan-agentes.md`: reparto, archivos que son tuyos, cómo subir a `main` y entregas H1–H7.
> 3. `docs/plan-rediseno.md`, secciones 3, 7 y 8.
> 4. `decisiones.md`.
>
> **Tu trabajo, en este orden:**
> 1. **Base visual y contraste (H1, hasta 04:00).**
>    - Un solo tema claro con *tokens*. Quita el modo oscuro de `globals.css`, que es la causa del texto ilegible, y pon `color-scheme: light`.
>    - Paleta, tipografías (Fraunces y Inter con `next/font`) y componentes en `components/ui/`, según el plan (3.2).
>    - **Todo texto debe tener contraste ≥ 4,5:1.** Agrega `tests/contraste.test.ts`, que calcule el contraste de cada par de tokens texto/fondo.
>    - Sube a `main` y escribe en `docs/estado-interfaz.md` qué componentes hay y cómo se usan.
> 2. **Cabecera, pie y portada (`/`).** La frase central, los 4 pasos del ciclo con datos vivos, la banda del aviso vigente por nivel (usa `risk_level` hasta que llegue H3), el mapa, el ranking y "¿Cómo se calcula?".
> 3. **Mapa (plan, sección 7):**
>    - mapa base CARTO Positron, con atribución de CARTO y OSM;
>    - lista lateral sincronizada;
>    - filtros por nivel, por problema y "sin entrega";
>    - ficha de comunidad;
>    - pantalla completa, leyenda y "Actualizado hace X s";
>    - accesible por teclado (la lista es la alternativa al mapa).
> 4. **Tarjetas:**
>    - `/tarjetas` en cuadrícula por amenaza y fase;
>    - `/tarjetas/[id]` y `components/tarjeta/*` con el formato v0.4 (H2): por qué importa, 3–5 pasos, evita, pide ayuda si…, fuentes con enlace, estado. Los campos v0.4 son opcionales: con las tarjetas actuales debe verse bien igual;
>    - `/fuentes`, leyendo de `lib/fuentes.ts` (H2).
> 5. **«Sin agua, a la vista» (sección 8).** Las consultas van en `lib/visibilidad.ts` (nuevo, tuyo).
>    - Contador de días sin agua por comunidad.
>    - `/comunidad/[id]`: línea de tiempo y botón "Compartir por WhatsApp" con un enlace `https://wa.me/?text=…` y texto que solo describe hechos confirmados.
>    - Tiempo de respuesta público.
>    - `/resumen` imprimible.
>    - **Sin nombres ni teléfonos; lo de ejemplo, con EJEMPLO.**
> 6. **`/entregas`, `/probar` (Chat) y `/suscribirse`** con el sistema nuevo.
> 7. **Estilo del panel** (`/panel`, `/panel/reportes`, `/panel/alertas`): solo JSX y clases. No toques `acciones.ts` ni `layout.tsx` (son de SERVIDOR).
> 8. **Imágenes de Higgsfield (H6, ya generadas: úsalas desde el paso 2).**
>    - Las tuyas están en `D:\Jonathan\Desktop\SOFTWARE\Hackathon\assets\higgsfield\lote2\portada\` y `...\lote2\ciclo\`.
>    - Revísalas: sin texto, personas ni manos.
>    - Optimízalas (WebP, ≤ 200 KB) y ponlas en `public/ilustraciones/`, con el pie "Ilustraciones generadas con IA".
>
> **Reglas que no se rompen:**
> - Repositorio público: nada de claves, tokens ni teléfonos en el código.
> - Lo de ejemplo siempre marcado **EJEMPLO**. Cada dato al público lleva fuente y fecha. La voz sintética se declara.
> - Mapa, tarjetas, fuentes, entregas, comunidades y resumen son **públicos** (sin login).
> - Todo en español, frases cortas y claras.
> - **No toques archivos de SERVIDOR** (tabla de `docs/plan-agentes.md`). Si necesitas algo suyo, pídelo en `docs/estado-interfaz.md` y sigue con otro bloque.
> - **No escribas en Supabase** (ni migraciones ni datos). Solo lees con las funciones existentes.
> - Sube a `main` al terminar cada bloque con el procedimiento del plan. Nunca `--force`.
> - Revisa cada página en 390 px (celular) y en 1280 px antes de subirla.
> - A las **10:30** paras de agregar cosas: solo corriges errores.
> - Al terminar cada bloque, actualiza `docs/estado-interfaz.md`: hecho, pendiente y qué necesitas.

## Prompt del Agente SERVIDOR (copiar y pegar en la sesión abierta en `Hackathon-servidor`)

> Eres el **Agente SERVIDOR** de PACHA. Trabajas en `D:\Jonathan\Desktop\SOFTWARE\Hackathon-servidor`, rama `servidor`, con `next dev` en el puerto 3002. Hay otro agente (INTERFAZ) trabajando a la vez en otra carpeta.
>
> **Lee primero, en este orden:**
> 1. `AGENTS.md`: es Next 16. Lee la guía de `node_modules/next/dist/docs/` que corresponda, en especial `01-app/02-guides/authentication.md` y `authentication-with-cache-components.md` antes del login.
> 2. `docs/plan-agentes.md`: reparto, archivos que son tuyos, cómo subir a `main` y entregas H1–H7.
> 3. `docs/plan-rediseno.md`, secciones 4, 5 y 6.
> 4. `decisiones.md`, `contratos/CONTRATOS.md`, `docs/siguientes-pasos-tarjetas.md` e `docs/instructivo-salida-tarjetas.md`.
>
> **Tu trabajo, en este orden:**
> 1. **Contrato v0.4 de tarjetas y fuentes (H2, hasta 04:00).**
>    - En `contratos/tipos.ts`, el tipo `Tarjeta` agrega `por_que`, `evitar` y `pedir_ayuda`, cada uno con su fuente, y `pasos` admite 3–5. **Todo opcional**, para que las 6 tarjetas actuales sigan valiendo.
>    - Adapta `SalidaBot` y los adaptadores (Telegram y WhatsApp). La web `/probar` es de INTERFAZ: avísale el cambio de forma.
>    - Escribe la migración SQL en `contratos/migraciones/`. **No la apliques: se la pasas a Jhonatan (H7).**
>    - Crea `data/fuentes.json` con las fuentes actuales (institución, título, año, url, tarjetas que la usan, fecha de consulta) y `lib/fuentes.ts`.
>    - Anota el cambio en `decisiones.md`, sube a `main` y avisa en `docs/estado-servidor.md`.
> 2. **Login serio (sección 5).**
>    - `lib/sesion.ts`: cookie firmada con HMAC (`SESSION_SECRET`), `HttpOnly`, `Secure`, `SameSite=Lax`, 8 h.
>    - Contraseñas con scrypt en `PANEL_USERS`, con formato `usuario:rol:hash`.
>    - Roles: `tecnico` y `admin`. Reiniciar demo y Buscar boletín son solo de `admin`.
>    - Página `/ingresar` con los componentes de `components/ui/` (H1). Si aún no están, usa clases simples con contraste AA.
>    - `proxy.ts` redirige a `/ingresar`. **Cada Server Action de `app/panel/acciones.ts` vuelve a validar sesión y rol.**
>    - Bloqueo de 10 min tras 5 intentos fallidos. Usuario y "Salir" en `app/panel/layout.tsx`.
>    - Script `npm run panel:usuario -- <usuario> <rol>`: pide la contraseña sin mostrarla e imprime la línea para `PANEL_USERS`.
>    - **Compatibilidad:** mientras no exista `SESSION_SECRET` en Vercel, el panel sigue con basic auth, para no dejarlo inaccesible.
>    - Pruebas: firma, vencimiento, rol, contraseña incorrecta y bloqueo.
> 3. **Alerta alarmante por nivel (sección 4).**
>    - `nivelAlerta(aviso)` (H3), `construirMensajeAlerta` v2 (encabezado 🔴 ALERTA ROJA o 🟠 ALERTA NARANJA según el **riesgo del Senamhi**, resumen de la fuente, **enlace al PDF original** `bulletins.source_url`) y `guionAudioAlerta()` (unos 20 s, sin enlace ni la línea de voz sintética).
>    - **Las cifras salen solo de la cita del boletín.** Pruebas con el fixture `scratch/fixtures/aviso-altiplano-2026-11-2.json`.
>    - Generación del audio **al aprobar** (1 llamada de TTS). Si falla, la alerta sale solo con texto.
>    - Regenera y sube el audio de la alerta del demo con `scripts/generar-audios.ts --alerta` (el cupo de TTS vuelve cerca de las 04:30).
> 4. **Tarjetas nuevas y completas (sección 6).**
>    - Completa `por_que`, `evitar` y `pedir_ayuda` de las 6 actuales y redacta las 6 nuevas (tabla 6.2).
>    - Usa los PDFs de Drive (carpeta DATOSPROYECTO) y **fuentes oficiales en línea** (VIDECI, Ministerio de Medio Ambiente y Agua, Ministerio de Salud, FAO Bolivia, Senamhi). Cada paso con documento, página y enlace.
>    - **Si algo no está en una fuente que puedas abrir y leer, no entra.** No rellenes.
>    - Agrega cada fuente nueva a `data/fuentes.json`.
>    - Todo queda en `borrador`. Arma la hoja de verificación (H5) con `scripts/armar-verificacion.mjs` y escribe los prompts de imágenes por paso en `docs/prompts-imagenes.md`, sección Lote 2 (H4). Hasta las **05:30**.
>    - Agrega a `MENU` las tarjetas nuevas (por ejemplo una opción "❄️ Nevada", **máximo 3 botones por mensaje**, límite de WhatsApp) y el factor `cultivos_sin_agua` si hace falta. Con prueba y línea en `decisiones.md`.
> 5. **Cuando Jhonatan o B confirmen cada tarjeta:**
>    - pásala a `verificada` y corre `npm run seed:lecciones`;
>    - imágenes de Higgsfield (H6) → `assets/lessons/<id>/` → `npm run subir:imagenes`;
>    - audios (**máximo 10 TTS por día en el plan gratis**: prioriza las del demo);
>    - `npm run exportar:tarjetas`.
> 6. **Imágenes ya listas (hazlo en el bloque 1, son 5 min):**
>    - `D:\Jonathan\Desktop\SOFTWARE\Hackathon\assets\higgsfield\lote2\tarjetas\sequia-antes_familia-01\paso2.webp` y `paso3.webp`, ya aprobadas: cópialas a `assets/lessons/sequia-antes_familia-01/`, luego `npm run subir:imagenes` y `npm run exportar:tarjetas`;
>    - `...\lote2\headers\<id>_header.webp`: encabezados de las tarjetas nuevas, para cuando se verifiquen.
> 7. **Bot:** en cada tarjeta, el enlace "Ver tarjeta completa" a `/tarjetas/<id>`. Revisa que «Mi reporte» y los problemas activos sigan funcionando.
>
> **Reglas que no se rompen:**
> - Repositorio público: nada de claves, tokens ni teléfonos en el código. Todo en `.env` (el equipo usa `.env`, no `.env.local`), y en `.env.example` solo los nombres.
> - Gemini solo extrae datos y elige ids de una lista cerrada. **Nunca redacta consejos.** Toda alerta la aprueba una persona.
> - Cada mensaje lleva fuente y fecha. La voz sintética se declara por escrito.
> - Cambios a `contratos/` solo con una línea en `decisiones.md`.
> - **No apliques migraciones ni borres datos en Supabase:** escribe el SQL y pídelo a Jhonatan en `docs/estado-servidor.md`. Cargar tarjetas con `npm run seed:lecciones` sí está permitido.
> - **No toques archivos de INTERFAZ** (tabla de `docs/plan-agentes.md`).
> - Sube a `main` al terminar cada bloque con el procedimiento del plan. Nunca `--force`.
> - A las **10:30** paras de agregar cosas: solo corriges errores.
> - Al terminar cada bloque, actualiza `docs/estado-servidor.md`: hecho, pendiente y qué necesitas de Jhonatan.

---

## Lo que tiene que hacer Jhonatan

### Antes de lanzar a los agentes (10 min)
1. **Aplicar la migración del panel.** En Supabase › SQL Editor, pega y ejecuta `contratos/migraciones/2026-11-22_lesson_sends.sql`. Sin esto, el botón "Enviar qué hacer" del panel queda desactivado y lo avisa.
2. **Crear `SESSION_SECRET`** (para el login nuevo):
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Agrégalo al `.env` de las **tres** carpetas (`Hackathon`, `Hackathon-interfaz`, `Hackathon-servidor`).
   - **Todavía no** lo pongas en Vercel: se pone cuando SERVIDOR termine el login y te pase las líneas nuevas de `PANEL_USERS`. Hasta entonces el panel sigue con la clave actual.
3. **Gemini TTS:** decide si activas el plan pagado. Sin él hay 10 audios por día y no alcanzan para todo. Sin cambio, SERVIDOR prioriza el audio de la alerta y el de la tarjeta pendiente.
4. **Abrir dos sesiones de Claude Code** (dos ventanas de VS Code):
   - `File › Open Folder` → `D:\Jonathan\Desktop\SOFTWARE\Hackathon-interfaz` → pegar el **prompt INTERFAZ**;
   - `File › Open Folder` → `D:\Jonathan\Desktop\SOFTWARE\Hackathon-servidor` → pegar el **prompt SERVIDOR**.

   Las dos carpetas ya existen, con su rama, su `.env`, `npm ci` hecho y los audios e imágenes locales copiados.

### Durante la noche
| Cuándo | Qué |
|---|---|
| Cuando quieras | Generar en Higgsfield el **lote 2** (`docs/prompts-imagenes.md`) y guardarlo en `D:\Jonathan\Desktop\SOFTWARE\Hackathon\assets\higgsfield\lote2\` |
| ~05:30 | Generar las **imágenes por paso** de las tarjetas nuevas (SERVIDOR las agrega al mismo documento) |
| ~05:30–09:00 | **Verificar las tarjetas nuevas** con B: unos 10 min cada una, contra la página citada. Avisar a SERVIDOR: "`<id>` verificada por `<nombre>`" |
| Cuando SERVIDOR avise | Aplicar en Supabase las **migraciones** que deje en `contratos/migraciones/` |
| Cuando SERVIDOR termine el login | Poner en **Vercel**: `SESSION_SECRET` y las líneas nuevas de `PANEL_USERS`; Redeploy; entrar por `/ingresar` |

### Antes del ensayo (10:30–11:00)
- **Reiniciar demo** en `/panel`: borra las pruebas de esta noche, incluidos mis reportes en «Comunidad de prueba».
- **Revisar en el celular**, en modo claro y en modo oscuro: `/`, `/tarjetas`, una tarjeta, `/comunidad/<id>`, `/entregas` y `/probar`.
- **Borrar las carpetas de los agentes** cuando todo esté en `main`:
  ```
  git worktree remove ../Hackathon-interfaz
  git worktree remove ../Hackathon-servidor
  ```
