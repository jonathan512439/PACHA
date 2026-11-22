# Estado del Agente SERVIDOR

_Última actualización: dom 22/11, ~11:45_que?: { texto, fuente: { doc, page } }`: "Por qué importa".
  - `evitar?: { texto, fuente }[]`: "Evita", de 0 a 2.
  - `pedir_ayuda?: { texto, fuente | null }`: "Pide ayuda si…".
  - Para el texto que se muestra usa **`textoPedirAyuda(t)`**: devuelve el de la tarjeta o el texto fijo `PEDIR_AYUDA_FIJO`.
  - `tieneSeccionesV04(t)` dice si trae alguna sección nueva.
- **`steps` y `step_sources` ahora son listas de 3 a 5** (antes, tuplas de 3). No supongas 3: recórrelas con `.map`.
- **`resolverImagenes(t, base, respaldo)`** devuelve un `pasos[i]` por paso si le pasas la tarjeta entera (con `steps`). `TarjetaVisual` sigue funcionando igual con las 6 actuales.
- **Fuentes (`lib/fuentes.ts`, puro, sirve en servidor y cliente):**
  - `listarFuentes()` → `Fuente[]` con `{ id, institucion, titulo, anio, url, tarjetas, consultado, nota }`.
  - `fuentesDeTarjeta(t)` → `{ fuente, paginas }[]`, sin repetir, para la sección "Fuentes" de `/tarjetas/[id]`.
  - `etiquetaFuente(f)` → "FAO (2010)".
  - **Si `url` es `null`, no lo enlaces**: muestra "Enlace por confirmar" y la `nota`. Hoy es el caso de CIPCA.
- **`/probar` (`components/probar/Chat.tsx`):** `SalidaBot` de tipo tarjeta cambió de forma:
  - `pasos` es una lista de 3 a 5 (el `.map` actual sirve);
  - nuevo `urlCompleta?`: enlace "Ver tarjeta completa" → `/tarjetas/<id>`. Conviene mostrarlo.
- Las 6 tarjetas actuales todavía no traen secciones v0.4: se completan en el bloque 4 (en borrador hasta que se verifiquen).

**Imágenes:** los pasos 2 y 3 de `sequia-antes_familia-01` ya están en Storage y el PNG está reexportado.

### Bloque 2 · Login con sesión y roles (en `main`)
- `/ingresar` con usuario y contraseña; sesión de 8 h en cookie firmada; Salir y usuario en `app/panel/layout.tsx`.
- Roles: `tecnico` y `admin`. **Buscar/Subir boletín y Reiniciar demo son solo de admin**: si un técnico lo intenta, la acción devuelve `{ ok: false, mensaje: "Esta acción es solo para el rol admin…" }`.
- **Para INTERFAZ (opcional):** para ocultar esos botones a un técnico, en un Server Component **detrás de `<Suspense>`** usa `accesoActual()` de `lib/acceso-panel.ts` → `{ usuario, rol } | null`.
- Sin `SESSION_SECRET` todo sigue como antes (basic auth). En Vercel **no cambia nada** hasta que Jhonatan ponga las dos variables.

### H3 · Nivel de la alerta (en `main`)
- **Para la banda de la portada (INTERFAZ):** `import { nivelAlerta, encabezadoAlerta } from "@/contratos/tipos"`.
  - `nivelAlerta({ risk_level, senamhi_level })` con las columnas de la fila `alerts` → `"roja" | "naranja" | null`.
  - `null` = sin color (amarillo, riesgo bajo o sin dato): muestra un aviso neutro. **No** lo pintes de naranja.
  - `encabezadoAlerta(nivel, hazard)` → "🔴 ALERTA ROJA · HELADA FUERTE", "🟠 ALERTA NARANJA · HELADA" o "⚠️ AVISO · HELADA". Si usas `<Aviso nivel>`, la palabra ya la pone el componente: usa solo la parte después del "·".
  - El boletín real del 14–23 nov tiene "Riesgo MEDIO por helada" → **naranja**.
- El mensaje de WhatsApp y Telegram cambió de formato (v2) y el audio se genera al aprobar. En `/panel/alertas` se ve el texto nuevo en cuanto se aprueba.

### Bloque 4 · Tarjetas nuevas en borrador (H4 y H5 listos)
**Tabla de ids** (los del plan no cumplen la regla de ids del contrato; los encabezados ya están renombrados en `assets/lessons/<id real>/header.webp`):

| Id del plan | Id real | Pasos | Fuentes |
|---|---|---|---|
| `nevada-antes-01` | `nevada-antes_animales-01` | 4 | FAO Caylloma p. 15–16 |
| `nevada-durante-01` | — (**sin tarjeta**) | — | no hay fuente oficial legible: no se rellena |
| `helada-despues-01` | `helada-despues-01` | 3 | FAO TCP/RLA/3217 p. 28–30; evita: Senamhi p. 7 |
| `sequia-cultivos-01` | `sequia-durante-02` | 4 | Senamhi p. 6–7 |
| `agua-segura-01` | `sequia-durante-03` | 5 | CDC (2 páginas web en español) |
| `sequia-durante-animales-01` | `sequia-durante-04` | 3 | Senamhi p. 7; FAO manual de alpacas p. 13–14 |

- Todas en **borrador**, cargadas en Supabase, con "por qué importa" y "pide ayuda si…" (FAO Bolivia, cartilla de la Unidad Municipal de Gestión del Riesgo, p. 14). No se publican hasta verificarlas.
- **Para INTERFAZ:** ya hay tarjetas con 4 y 5 pasos y con `por_que`, `evitar` y `pedir_ayuda`. Para verlas en `/tarjetas/<id>` en local, usa `DEMO_PERMITIR_BORRADOR=1`. `fuentesDeTarjeta(t)` ya las cubre.
- **Menú del bot:** opción ❄️ Nevada, que aparece sola cuando su tarjeta esté verificada (hoy siguen los 3 botones).

### Audio de la alerta del demo (hecho, 04:10)
- Regenerado con `guionAudioAlerta` (alerta naranja, 25,9 s, voz Kore) y subido a `audios/alertas/altiplano-2026-11-2.mp3|.ogg`. Usé 1 TTS del cupo de hoy. El anterior quedó guardado fuera del repo.
- Si el navegador o WhatsApp todavía reproducen el anterior, es caché del CDN (hasta 1 h).

### CI de GitHub en verde
- Fallaba desde el sáb 21/11 porque typecheck corría sin `next typegen`. Ya pasa en `main`.

### Prueba de punta a punta EN PRODUCCIÓN (bot web, 09:49) · ✅ todo OK
Recorrido en https://pacha-lilac.vercel.app/api/bot/web con la Comunidad de prueba. Usó **2 llamadas de IA** (pregunta libre y reporte). No se borró nada.
- Registro (aceptación → lista de comunidades → «Comunidad de prueba») ✔
- Menú de **3 botones** (Agua, Animales, Cultivos) ✔. Nevada no aparece, porque su tarjeta sigue en borrador ✔
- Las 6 combinaciones Antes/Ahora devuelven solo las 6 tarjetas verificadas. Cada una trae fuente con página, «Verificada contra fuente», audio, `urlCompleta` a `/tarjetas/<id>` de producción y 3 pasos. **Ninguna en borrador** ✔
- Pregunta libre «¿Cómo protejo mis papas de la helada?» → `helada-antes_familia-01` ✔
- Reporte por texto (5 días sin agua, 12 familias) → «¿Es correcto?» → Sí → registrado, con la tarjeta `sequia-durante-01` ✔
- ESTADO y botón «📋 Ver mi reporte» → «Confirmado · ya está en el mapa público» ✔
- Quedaron de la prueba un suscriptor web y un reporte confirmado en la Comunidad de prueba. **Reiniciar demo** los limpia antes del ensayo.

**TERMINADO salvo verificaciones: 09:49**

### Las 5 tarjetas nuevas: VERIFICADAS (Jhonatan, ~10:10) y publicadas
- `nevada-antes_animales-01`, `helada-despues-01`, `sequia-durante-02`, `sequia-durante-03` y `sequia-durante-04` quedan en `verificada` por **Jhonatan** (huella registrada) y cargadas con el seed.
- Audio (5 TTS; van 6 de 10 hoy) y PNG exportados y subidos. Los pasos sin ilustración muestran el ícono del tema (gotas, semilla, heno o corral).
- **Cambio visible en el bot:** el menú ahora tiene 4 opciones (sale ❄️ Nevada), así que en WhatsApp va como **lista** «Ver temas», no como 3 botones. Agua › Ahora manda 2 tarjetas; Animales › Ahora y Cultivos › Ahora mandan 3.
- **Agua segura** sigue con la fuente del CDC (3 minutos). La OPS indica unos 5 minutos en Oruro: ver la sección de arriba.

## En curso
- Cuando confirmen cada tarjeta: pasarla a verificada, seed, imágenes, audio y PNG.

## Necesito de Jhonatan
- **H5 · Verificar las 5 tarjetas nuevas** (~10 min cada una, con B). La hoja está en `scratch/verificacion/verificacion-tarjetas.md` de **esta carpeta** (`Hackathon-servidor`), local porque lleva citas literales. Los PDF están en `scratch/verificacion/fuentes/`. Para cada tarjeta se cotejan los pasos, el "por qué", el "evita" y el "pide ayuda". Cuando esté, avísame: "`<id>` verificada por `<nombre>`", o qué punto falla.
- **Agua segura (`sequia-durante-03`):** la fuente es el CDC de EE. UU. (páginas en español). ¿Te sirve, o prefieres esperar una guía del Ministerio de Salud de Bolivia? Sin otra fuente legible, la alternativa es dejarla fuera.
- **Propuestas para las 6 verificadas** (`data/tarjetas/propuestas-v04.json`): "por qué", "evita" y "pide ayuda", con fuente. Están al final de la misma hoja H5. Si las das por buenas, las copio a cada tarjeta y hay que volver a marcarla verificada (cambia su huella). **No es obligatorio para el demo.**
- **H4 · Imágenes por paso:** prompts en `docs/prompts-imagenes.md` → "Pasos de las tarjetas nuevas". Mejor generarlas cuando cada tarjeta esté verificada.
**H7 listo para aplicar: v0.4**

- **H7 · Aplicar la migración** `contratos/migraciones/2026-11-22_tarjetas_v0.4.sql` en Supabase › SQL Editor. Primero quita cualquier regla CHECK vieja sobre `steps`, `step_sources` o `step_image_paths` (sin importar su nombre) y al final lista las columnas nuevas y los CHECK de `lessons`, para comprobar que solo quedan las de 3 a 5 pasos. Se puede ejecutar más de una vez. **No es urgente**: la app funciona igual sin ella. Hace falta antes de cargar tarjetas con "por qué", "evita" o "pide ayuda" (bloque 4).
- **Login, ahora en local (las 3 carpetas):** el `.env` local ya tiene `SESSION_SECRET`, así que el panel local pide `/ingresar` y **las entradas viejas `usuario:clave` ya no sirven allí**. Crea tus usuarios:
  ```
  npm run panel:usuario -- jhonatan admin
  npm run panel:usuario -- <técnica> tecnico
  ```
  y pon las líneas en `PANEL_USERS` (separadas por comas) del `.env`. Contraseña de al menos 10 caracteres.
- **Login en Vercel (cuando quieras):** pon **juntas** `SESSION_SECRET` (el mismo u otro de 64 hex) y las líneas nuevas de `PANEL_USERS`; Redeploy; entra por `/ingresar`. Si pones solo una de las dos, el panel queda cerrado o sigue con basic auth.
- **CIPCA:** su sitio no respondió (error TLS) y no pude confirmar el enlace al boletín "Propuestas de respuesta integral a la sequía…". Si tienes el PDF o el enlace, pásamelo. Mientras tanto, la fuente aparece **sin enlace**.

## Agua segura (`sequia-durante-03`): fuentes OPS/OMS encontradas (sin cambiar la tarjeta todavía)
Abiertas y leídas el 22/11 (PDF en `scratch/verificacion/fuentes/ops-*.pdf`):
- **OPS/OMS, Notas técnicas sobre agua, saneamiento e higiene en emergencias n.º 10, "Tratamiento de emergencia de agua potable en el lugar de consumo"**: https://paho.org/sites/default/files/2019-12/Nota-tecnica-sobre-agua-saneamiento-higiene-10.pdf
  - **p. 3:** el agua se guarda en recipientes limpios, cubiertos, en un lugar fresco y oscuro; mejor de boca ancha y con tapa que cierre bien, porque son fáciles de limpiar.
  - **p. 4:** agua turbia: dejarla asentar 24 h y pasarla con cuidado a otro recipiente, o colarla con una tela fina; después, hervirla o desinfectarla.
  - **p. 5:** hervir vigorosamente 1 minuto desde que empieza a hervir a nivel del mar, **y 1 minuto más por cada 1000 m de altitud**; mata casi todos los patógenos.
- **OPS/OMS, "El agua en situaciones de emergencia" (OPS/HEP/99/34)**: https://paho.org/sites/default/files/2019-12/WtrEmrgS.pdf — **p. 12:** la misma regla (1 minuto más por cada 1000 m).
- **Diferencia con el CDC:** el CDC dice 3 minutos por encima de unos 2000 m; la regla de la OPS da **unos 5 minutos en Oruro (~3700 m)**. Recomiendo la OPS: es de la región y más prudente en altura.
- **También FAO** (cartilla de agua segura de un proyecto de Guatemala, 2013, https://www.fao.org/4/ar649s/ar649s.pdf, p. 5): hervir 10 minutos y guardar en recipientes limpios y tapados.
- **Ministerio de Salud de Bolivia:** no encontré una guía que pudiera abrir y leer.
- **Versión posible con OPS** (si Jhonatan la elige; cambia la tarjeta y su verificación):
  1. «Si el agua está turbia, déjala asentar y pásala con cuidado a otro recipiente, o cuélala con una tela fina.» (nota p. 4)
  2. «Hierve el agua con fuerza un minuto, y un minuto más por cada 1000 metros de altura.» (nota p. 5)
  3. «Guárdala en recipientes limpios y tapados, en un lugar fresco y oscuro.» (nota p. 3)
  4. «Usa recipientes de boca ancha con tapa que cierre bien: son fáciles de limpiar.» (nota p. 3)
  - Por qué: «Hervir el agua mata casi todos los microbios que transmite.» (nota p. 5)
  - El paso del CDC «sin meter las manos» no está en la OPS: saldría o se queda con el CDC como segunda fuente.

## Necesito de INTERFAZ
- Nada por ahora. `/ingresar` ya usa `components/ui` (Campo, Boton, Aviso). Gracias por H1.## ▶ Para la demo: leer `docs/demo-tarjetas.md`
**Necesito de Jhonatan (5 min):** aplicar `contratos/migraciones/2026-11-22_editor_tarjetas.sql` y correr `npm run proponer:versiones`. Después, en `/panel/tarjetas › Por verificar`, verificar y publicar «Agua segura (OPS)» y «Después de la sequía».

### Editor de tarjetas (opción 2) · en `main`
- `/panel/tarjetas` (por verificar, devueltas, todas, editar, nueva, retirar), `/panel/tarjetas/version/<id>` (comparación, enlace a la página citada, verificar y publicar o devolver) y `/panel/fuentes`.
- Probado en el navegador (local): listado, formulario con la versión vigente, rechazo de pasos de más de 18 palabras y de pasos sin fuente, y lista de fuentes con sus tarjetas. Publicar se prueba en el demo, con la migración aplicada.
- **Para INTERFAZ:** rutas nuevas en `app/panel/tarjetas/**` y `app/panel/fuentes/**`, más los enlaces «Tarjetas» y «Fuentes» en `app/panel/layout.tsx` (archivo de SERVIDOR).

### Imágenes del lote 3 · subidas
- Los 19 pasos de las 5 tarjetas nuevas (agua segura con los pasos 4 y 5 del CDC mientras siga vigente), el paso 4 de la OPS y las 5 imágenes de `sequia-despues-01`. PNG regenerados.


