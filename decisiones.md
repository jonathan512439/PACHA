# Decisiones

## Cerradas (antes del análisis)
- Solo retransmitimos alertas oficiales del Senamhi, con fuente y fecha. No pronosticamos.
- La IA extrae datos y elige ids de tarjetas. El código decide si se alerta y un humano aprueba. Nada se envía sin estado `aprobada`.
- Datos de demo ficticios y marcados como EJEMPLO. Repo público sin claves ni teléfonos.
- Stack: Next.js (App Router, TS) + Vercel + Supabase + `@google/genai` + Zod.

## Cerradas (sáb 21/11, MVP v2 aprobado por A; detalle en `docs/mvp.md`)
- Alcance recortado al MVP. Lo que queda fuera está en `docs/mvp.md` §6.
- **Canales:** WhatsApp en el escenario (3 teléfonos del equipo). El jurado usa **Telegram y `/probar`**. Orden de construcción: `procesarMensaje` + `/probar` → Telegram → WhatsApp. Si WhatsApp no funciona el dom a las 11:45, el escenario usa Telegram.
- **"Qué hago":** menú fijo sin IA (mapeo en `docs/mvp.md` M1) más pregunta libre, donde la IA solo devuelve ids.
- **Tarjetas:** `borrador` → `verificada` (C, contra la página citada) → `revisada` (técnico). El bot y el menú usan `verificada` y `revisada`. Son 6, con meta de 12.
- **Boletín:** detección automática (cron diario y botón "Buscar boletín ahora") con aviso a la técnica. La subida manual queda como respaldo.
- **Demo con el boletín real** del Senamhi Altiplano del 14–23 nov 2026. Las comunidades siguen siendo EJEMPLO.
- **Audio de la alerta del demo:** pregenerado en la laptop de C y adjuntado por regla. El TTS en vivo queda en "si sobra".
- **Prioridad por comunidad** = máximo de los reportes confirmados no atendidos.
- **`/panel/reportes`** incluye registrar entrega con foto y confirmar o descartar los reportes en `revisar`. Se agrega el estado `descartado`.
- **Foto adjunta al último reporte:** queda en "si sobra".
- **Seed y Reiniciar demo:** responsable B.
- **Modelo:** `gemini-3.5-flash-lite`. Una clave por persona (cada una en su propio proyecto) y otra para el demo. Fixtures con `DEMO_FIXTURES=auto`.
- **Panel:** basic auth con `PANEL_USERS`. Las comunidades nunca inician sesión.
- **Fuera del stack:** `next/og`, `react-pdf`, ffmpeg en el servidor, ElevenLabs y Supabase Auth.
- **Pitch:** liderar con la sequía actual. No decir que el Senamhi "no tiene canal" (tiene WhatsApp y app). Las cifras salen de `docs/analisis-critico.md` #14.

## Cerradas (sáb 21/11, ajustes de A al plan v2)
- **Regla de alerta aprobada:** `debeAlertar` alerta si `riesgo_helada` es `medio` o `alto`. Un rango ("MEDIO A ALTO") se toma por su valor superior. En el boletín del 14–23 nov, el riesgo de helada para Oruro es MEDIO (el "MEDIO A ALTO" es por viento).
- **Prueba de las 13:00:** incluye la extracción `AvisoGemini` del PDF real (zona, `riesgo_helada` y citas literales) y guarda el fixture (`scratch/probar-gemini-boletin.mjs`).
- **Cuota de Gemini:** A confirma el límite real de flash-lite a las 13:00. La clave del demo solo vive en Producción de Vercel y nunca se usa en desarrollo. Los ensayos 2 y 3 corren con `DEMO_FIXTURES=on`. `/probar` (y Telegram, que también usa el jurado) tienen un tope global diario; al agotarse responden con un mensaje fijo y el menú sigue funcionando.
- ~~**Tarjetas:** se agrega `author`, con la regla `verified_by <> author`.~~ → **Revisado (sáb 12:50): no hay campo `author`.** La autoría que se muestra es la de la fuente (institución y documento en `source_doc`). `verified_by` es el nombre de la persona del equipo que comprobó los pasos. La etiqueta pública pasa a ser **"Verificada contra fuente"**: sin autor no podemos garantizar "por una segunda persona".
- **Excel de Drive (12 tarjetas):** se cargan todas como `borrador` ("revisado / Verificación Documental" no es una persona). Pasan a `verificada` solo tras comprobar cada paso en la página citada. Primero las 6 del menú.
- **Recortes adelantados:** si algo no llega al control del sáb 18:00, `/alertas/[id]`, `/suscribirse` completo (queda solo el QR) y la vista A4 pasan a "si sobra" en ese momento.
- **Control 13:00:** bloquean la prueba de audio y PDF, el esquema en Supabase y los contratos. Repo, Telegram y Meta pueden llegar hasta las 14:30.
- **Guion:** 3:40. La seguridad baja a 20 s o pasa a la ronda de preguntas.
- **Plantilla de alerta:** usa las palabras del boletín (zona, `cita_evento` y `cita_riesgo` literales), no solo la temperatura. Sin `cita_evento`, la alerta no se envía.
- **Fotos del seed:** tomadas por el equipo, de objetos, sin personas ni imágenes de internet, sin EXIF y con la etiqueta "FOTO DE EJEMPLO".

## Nombre
- **PACHA** (sáb 21/11). Repo: `github.com/jonathan512439/PACHA` (público).

## Contratos
- **v0.2 aplicados (sáb 21/11, ~13:05)** en `/contratos`: `schema.sql`, `storage.sql`, `tipos.ts`, `prioridad.ts` y `CONTRATOS.md` (la lista de cambios está en su sección "Cambios v0.2"). La v0.1 queda en `contratos/v0.1/`. Los tipos se compilaron con `tsc --strict` y se probaron con el aviso real del 14–23 nov. Guía de instalación: `docs/setup-supabase.md`.

- **v0.3 de tarjetas (sáb 21/11, tarde).** Fuentes por paso y estado `verificada`:
  - **`step_sources`:** cada tarjeta guarda una fuente `{doc, page}` **por paso**, en el mismo orden que `steps`, porque en varias tarjetas los tres pasos salen de documentos o páginas distintos y un único `source_page` no permitía verificar paso por paso. El pie de la tarjeta agrupa esas fuentes por documento ("p. 7 (paso 1), p. 6 (pasos 2 y 3)"). `source_doc`/`source_page` quedan solo como resumen.
  - **`verificada` y `author`:** `author` es el **autor del texto o de la guía de origen** (institución citada en `step_sources`), no la persona del equipo que redactó. Para `verificada` o `revisada` basta con `verified_by`, la persona del equipo que comprobó cada paso en la página citada (`lessons_verificada_check`). La regla `verified_by <> author` se quitó; detalle en "Tarjetas v0.3: regla de autoría corregida". La etiqueta pública sigue siendo "Verificada contra fuente". La tarjeta y el bot no muestran `author` aparte, porque el pie ya cita la institución y la página de cada paso.
  - **Sin CSS modules:** la regla de Turbopack de Tailwind en `next.config.ts` (`"*.css" → as: "*.css"`) convierte también los `.module.css` en CSS global, y las clases importadas llegan como `undefined`. Los estilos de tarjetas van en CSS global con prefijo (`components/tarjeta/tarjeta.css` → `tj-`, `app/tarjetas/tarjetas.css` → `tjs-`). Vale para todo el equipo: usar Tailwind o CSS global con prefijo.
  - **Control de `author`:** `problemasDeAutor` (`lib/tarjeta-contenido.ts`) exige que cada parte de `author` (separadas por ";") aparezca en alguna fuente de los pasos, y rechaza al equipo o a la IA. El seed no carga nada si falla, y vitest también lo comprueba.
  - **Audios de tarjetas (sáb 21/11):** `npm run generar:audios` (`scripts/generar-audios.ts`) genera con Gemini TTS (`gemini-3.8-flash-tts`, API `interactions`, v1beta) y convierte con ffmpeg a MP3 64k y OGG Opus mono 32k. Solo trabaja con tarjetas `verificada`/`revisada`, y se niega a grabar si el guion de `guiones_audio.json` no contiene el título y los pasos exactos. `-- --alerta` genera el audio de la alerta del demo con el mismo texto que arma `lib/boletin.ts` (`alertas/altiplano-2026-11-2`). Probado con `sequia-durante-01`: 21,3 s, Opus mono 48 kHz (ese archivo de prueba no se subió). Paso a paso completo: `docs/instructivo-salida-tarjetas.md`.
  - **Publicación:** el bot y la web solo muestran `verificada`/`revisada`. `DEMO_PERMITIR_BORRADOR=1` (apagado por defecto) permite mostrar `borrador`, siempre con la etiqueta "BORRADOR · sin verificar" (web, PNG y mensaje).
  - **Archivos:** migración en `contratos/migraciones/`; cambios en `contratos/CONTRATOS.md` ("Cambios v0.3").
- **Imágenes y audios de tarjetas fuera de git (sáb 21/11):** las 6 cabeceras (~1 MB en total), los 18 pasos, los PNG y los audios van solo a Supabase Storage (buckets `tarjetas` y `audios`). `assets/lessons/`, `assets/audio/` y `exports/` están en `.gitignore`. Motivos: la licencia de las imágenes de la cuenta de prueba sigue sin revisar (`docs/plan-tarjetas.md` §10), y el repo es público. Si falta una imagen, la tarjeta no queda con un hueco: un paso sin imagen usa un ícono `lucide-react`, una tarjeta sin cabecera usa la de `helada-antes_animales-01` y, si tampoco está, una franja neutra.

## Supabase
- **Proyecto `PACHA` (sa-east-1, Postgres 17)** con el esquema v0.2 aplicado. Revisado por MCP el sáb 21/11:
  - 10 tablas, columnas y restricciones iguales a `contratos/schema.sql`;
  - RLS activado en todas, sin políticas;
  - 2 estaciones cargadas;
  - 5 buckets, con `reportes` privado.
  - Los avisos del panel son solo informativos y esperados (RLS sin políticas, índices sin uso porque todavía no hay datos).

- **Permisos (sáb 21/11):** el proyecto no exponía tablas nuevas a la API, y `service_role` recibía "permission denied". Se aplicó la migración `grant_service_role_public_tables`: permisos de datos **solo** para `service_role`, también para las tablas futuras. Se agregó a `schema.sql`. `probar-supabase.mjs` da todo OK (conexión, tablas, restricciones, buckets, subida y RLS con la clave pública).

## Pruebas de las 13:00
- **PDF (sáb 21/11, `gemini-3.5-flash-lite`):** el primer intento dio `riesgo_helada = "alto"`, confundiendo la fila del viento, aunque la cita decía MEDIO, y la mínima salió 0 °C (la de la macrorregión). Se ajustó una vez: el código lee el riesgo de la cita (contrato v0.2.1) y se mejoraron el prompt y el orden de los campos. **Segundo intento: 9/9 chequeos OK** (medio, 1 °C, citas literales, 3,8 s). Fixture en `scratch/fixtures/aviso-altiplano-2026-11-2.json`.
- **Audio de entrada (sáb 21/11):** Gemini (`gemini-3.5-flash-lite`) **acepta y transcribe sin conversión** OGG/Opus mono 48 kHz (formato de las notas de voz de WhatsApp y Telegram), WebM/Opus (lo que graba Chrome) y MP3. Probado con audio sintético codificado igual que una nota de voz; falta confirmarlo con **una** nota real de WhatsApp. **No hace falta ffmpeg en el servidor ni Groq.**
- **Voz de salida (sáb 21/11):**
  - Gemini genera voz en español. Los modelos de voz **solo existen en la API `v1beta`**: `gemini-3.8-flash-tts` (estable, el elegido), `gemini-3.8-flash-lite-tts` y `gemini-3.1-flash-tts-preview`.
  - Se usa la API `interactions` del SDK: con `generateContent` y `speechConfig` la petición fue rechazada.
  - Entrega **MP3 de 44,1 kHz mono**. **No entrega OGG/Opus** (error 400), así que el OGG para WhatsApp y Telegram se convierte con ffmpeg en la laptop.
  - **La voz lee en voz alta todo el texto, instrucciones incluidas.** Con un prefijo de estilo, el audio duró 15 s; con solo el texto, 7,3 s y la transcripción fue exacta. Hay que mandar solo el texto exacto.
  - No hace falta ElevenLabs.

## Integración de Gemini (sáb 21/11)
- **`lib/gemini.ts`** (solo servidor):
  - `extraerAviso(pdf)` y `interpretarMensaje(entrada, tarjetas)`, con JSON Schema generado desde Zod y validación con el mismo esquema.
  - Límite de 15 s y **un reintento ante el 503 "high demand"**, que apareció en las pruebas.
  - `DEMO_FIXTURES` (`off`/`auto`/`on`). El fixture del boletín solo se usa si coincide el **hash del PDF**.
- **`lib/supabase.ts`** (cliente con la clave secreta) y **`lib/tarjetas.ts`** (tarjetas enviables).
- **Fixtures reales** en `/fixtures`: el boletín del 14–23 nov, el reporte del guion y la pregunta sobre vacunas.
- **`POST /api/dev/gemini`:** solo en desarrollo, devuelve 404 en producción.
- **Probado dentro de `next dev`:**
  - reporte (6 días, 40 familias, factor correcto);
  - vacuna y engaño sin tarjeta;
  - papa → `helada-antes_familia-01`;
  - boletín → alertar con riesgo medio;
  - con Gemini caído: fixtures correctos y nunca el fixture de otro boletín.
- **Next 16:** no permite dos `next dev` en la misma carpeta.

## Tarjetas v0.3: regla de autoría corregida (sáb 21/11)
- **`author` = autor del texto o guía de origen** (por ejemplo "FAO Bolivia"). Es la única autoría que se menciona. **Se quita la regla `verified_by <> author`**: `verificada`/`revisada` solo exige `verified_by`. Se corrigió en `tipos.ts`, `schema.sql`, la migración v0.3, `tests/tarjetas.test.tsx`, `docs/plan-tarjetas.md` y `CONTRATOS.md`.
- ~~**Pendiente para el agente de tarjetas:** en `data/tarjetas/tarjetas.csv` la columna `author` dice "Jhonatan con asistencia de IA" y debe pasar a decir el autor de la guía.~~ → **Hecho:** en `tarjetas.json` y `tarjetas.csv`, `author` es la institución de las fuentes citadas: `helada-antes_familia-01` y `helada-durante-01` = "Senamhi–INSA"; `helada-antes_animales-01` = "FAO; Senamhi–INSA"; `sequia-antes_familia-01` = "FAO; CIPCA"; `sequia-antes_animales-01` = "FAO; Senamhi–INSA; CIPCA"; `sequia-durante-01` = "Senamhi–INSA; CIPCA". No se tocó `paquete_tarjetas/`, el paquete original.

## Bot y Telegram (sáb 21/11)
- **`procesarMensaje`** (`lib/bot/`) y **`POST /api/bot/web`** (cookie anónima `httpOnly`): conversación de 12 pasos probada contra la base real (registro, menú, reporte con prioridad 55,4, vacuna, tarjeta por pregunta, otra comunidad, `BAJA`). El límite por persona cuenta **solo los mensajes que usan IA**. Las tarjetas se arman con `lib/tarjetas.salidaTarjeta` (v0.3, del agente de tarjetas).
- **Telegram:** `POST /api/webhooks/telegram` + `lib/canales/telegram.ts`.
  - Verifica `secret_token` en tiempo constante, responde 200 y procesa con `after()`.
  - Deduplica por `update_id`. Solo chats privados.
  - Notas de voz: descarga con `getFile`, rechaza más de 60 s y las pasa como OGG a Gemini.
  - Botones como teclado *inline*. Tarjetas en HTML, con foto y nota de voz si existen.
  - Probado con *updates* simulados: 7/7 OK. Falta probar con el bot real, que necesita el token.
- **Scripts:** `scratch/telegram-webhook.mjs` (set/info/delete) y `scratch/telegram-local.mjs`, para desarrollo local sin URL pública, con `getUpdates`.

## WhatsApp (sáb 21/11)
- **`GET|POST /api/webhooks/whatsapp`** + `lib/canales/whatsapp.ts`:
  - Verificación con `hub.verify_token` y firma `X-Hub-Signature-256` (HMAC del cuerpo crudo, comparación en tiempo constante).
  - Responde 200 y procesa con `after()`. Solo mensajes del `WHATSAPP_PHONE_NUMBER_ID` propio; los estados de entrega se ignoran.
  - Deduplica por `wamid`. Marca como leído y muestra "escribiendo…".
  - Audios: descarga del media (máx. ~1 MB) y los pasa como OGG a Gemini.
  - Botones de respuesta, listas y tarjetas con formato de WhatsApp más su audio.
  - Las respuestas viajan dentro de la ventana de 24 h, así que no necesitan plantilla.
- **Graph API:** versión por variable `WHATSAPP_GRAPH_VERSION` (por defecto `v23.0`; NO VERIFICADO que siga vigente).
- **Pruebas:** `tests/whatsapp.test.ts`, 8 casos (verificación, firma, payload y traducción de entrada y salida); en total 28/28. También se comprobó en el servidor real que sin firma o sin token responde 401/403. El flujo completo con número real queda pendiente de la app de Meta.
- **Audio saliente:** va sin el indicador de nota de voz (llega como audio con ícono de música). Falta confirmar el nombre del campo para mostrarlo como nota de voz.

## Estado de producción (sáb 21/11, tarde)
- **Migración v0.3 aplicada** (a mano en el SQL Editor; el MCP de Supabase rechaza escrituras desde esta extensión).
  - Verificado: `lessons` tiene `step_sources`, `author`, `header_image_path`, `step_image_paths` y `card_image_path`, y ya no tiene `image_is_ai`.
  - Regla `lessons_verificada_check` = borrador o `verified_by`; se conserva la de `revisada`.
  - La consulta de `lib/tarjetas.ts` funciona. La tabla está vacía: falta `npm run seed:lecciones`.
- **Producción desplegada** desde `main` (`3c4efa2`).
- **Telegram:** webhook registrado en `https://pacha-lilac.vercel.app/api/webhooks/telegram` (@pacha_oruro_bot). **Probado por A: todo funcional.**
- **WhatsApp:** código desplegado; falta la app de Meta (instructivo para C en `docs/instructivo-whatsapp.md`).

## API del boletín, alertas y entregas (sáb 21/11, 16:10)
- **`lib/boletin.ts`:** lee la página de boletines decenales, toma el ALTIPLANO más reciente (con dedupe por `source_url`), guarda el PDF, extrae con Gemini y decide con `decidirAlerta`. Si corresponde, crea la alerta en **borrador** (plantilla, tarjeta por regla y audio pregenerado si existe en `audios/alertas/<clave>.ogg|mp3`) y avisa a la técnica por `TECNICA_CONTACTO`.
- **`lib/alertas.ts`:**
  - aprobar: rearma el mensaje con la tarjeta actual y exige que sea publicable;
  - enviar: a los suscriptores activos de la estación, registra en `alert_deliveries` y reintenta solo a los fallidos;
  - descartar.
- **`lib/entregas.ts`:** registrar (foto ≤ 5 MB sin EXIF, unidad según el tipo, reporte `atendido`) y `notificarEntrega` ("¿Llegó?" a quien reportó o a la comunidad).
- **Rutas:**
  - `POST /api/boletin/buscar|subir`, `POST /api/alertas/[id]/aprobar|enviar|descartar` y `POST /api/entregas`, con basic auth del panel (`lib/panel-auth.ts`, `PANEL_USERS`);
  - `GET /api/boletin/buscar` para Vercel Cron (`CRON_SECRET`), diario a las 11:00 UTC (07:00 en Bolivia).
- **Contrato:** `construirMensajeAlerta` acepta `tarjeta: null`.
- **Pruebas:** 35/35 unitarias (7 nuevas). De punta a punta contra el boletín real: 18/18 chequeos (autenticación, alerta en borrador con riesgo medio, sin duplicados, aprobación bloqueada sin tarjeta, aprobación firmada, envío con fallo registrado y reintento, entrega). Limpieza completa: el boletín de nov sigue disponible para detectarlo en vivo en el demo.

## Interfaz y datos de ejemplo (sáb 21/11, 17:15)
- **A construyó la interfaz P0**, porque B no había subido pantallas.
  - Páginas: layout en español, mapa `/`, `/probar`, `/entregas` y `/suscribirse`.
  - Panel con `proxy.ts` y Server Actions: resumen y prioridad, alertas, reportes y entregas.
  - Plan en `docs/plan-interfaz.md`. B pule encima: no la rehace.
- **Seed de demo** (`npm run seed:demo` y botón "Reiniciar demo"): 9 comunidades con UUID fijos, 6 reportes y 3 entregas EJEMPLO. Kantuta Pampa queda sin reportes para el cambio de color en vivo.
- **Probado en producción** por el canal web: registro → reporte → confirmación → la "Comunidad de prueba" pasó de gris a 49,4 en el mapa. Después se reinició el demo.
- **Pasos restantes por persona** y los dos caminos para WhatsApp (número de prueba o número propio): `docs/pasos-restantes.md`.

## Menú y voz sintética (dom 22/11)
- **Contrato (`contratos/tipos.ts`, MENU):** "🌱 Cultivos › Ahora" mostraba `helada-durante-01`, que desde la v0.3 es de animales. Ahora muestra `helada-antes_familia-01`, la única tarjeta de cultivos. Hay un test que impide que Cultivos vuelva a mostrar tarjetas de otro tema.
- **Voz sintética:** el audio ya **no dice** "Mensaje con voz sintética" (pedido de A). La declaración queda **escrita** junto al audio en los tres canales ("🔊 Audio con voz sintética") y en el texto de la alerta.

## Panel: problemas activos (dom 22/11, 02:30)
- **Contrato v0.3.1 (`contratos/schema.sql`):** tabla nueva `lesson_sends` (factor, tarjeta, comunidad, personas, quién, cuándo). Migración: `contratos/migraciones/2026-11-22_lesson_sends.sql`.
- `/panel` agrupa los reportes confirmados por problema y envía la tarjeta "durante" de ese factor (misma regla que el bot) a las comunidades que lo reportan. No se repite a la misma comunidad por el mismo factor en 24 h. Solo tarjetas publicables.
- **"Mi reporte" en el bot:** ESTADO o el botón tras confirmar. Muestra estado, puesto en la prioridad pública y entrega. Sin IA.

## Interfaz: base visual (dom 22/11, H1)
- **Un solo tema claro** (`color-scheme: only light`): el modo oscuro de `globals.css` era la causa del texto ilegible. Tokens de color en `app/globals.css` y `components/ui/tokens.ts`; `tests/contraste.test.ts` exige texto ≥ 4,5:1 y gráficos ≥ 3:1.
- **Fuentes:** Inter (texto) y Fraunces (títulos), con `next/font`. Componentes compartidos en `components/ui/` (uso en `docs/estado-interfaz.md`).

## Pendientes
- ⚠️ **RECORDATORIO — tarjetas "para la demo" (sáb 21/11):** las 6 están en `verificada` por "Jhonatan", pero el cotejo lo hizo el agente de tarjetas, sin el PDF de CIPCA, y se cambiaron 4 pasos y 1 página. **Corregir y verificar a mano:** ver `docs/RECORDATORIO-tarjetas-demo.md`.
- **Ilustraciones de las tarjetas** (A las está generando): se discuten cuando estén listas. Regla vigente: son decorativas, sin texto con consejos, y se marcan "Ilustración generada con IA".
- **PDF faltantes para verificar:** FIDA PRO-CAMÉLIDOS (6 tarjetas) y Practical Action (2 tarjetas).
- **Tarjeta T-07, paso 2** ("Reduce el tamaño del hato…"): no aparece en las páginas citadas de al930s. Hay que corregirlo o quitarlo. *(Las 6 tarjetas del MVP no lo incluyen; una prueba de vitest falla si la frase aparece.)*
- **Verificación de las 6 tarjetas:** las 6 están en `borrador`. Falta que una persona del equipo coteje cada paso en la página citada y firme `verified_by`.
- **Numeración de páginas:** usar la del visor de PDF; comprobar cuál usa el Excel.
- **Límite real de `gemini-3.5-flash-lite`** (A, 13:00) y valor de `PROBAR_TOPE_DIARIO`.
- **Voz definitiva:** Gemini TTS (`gemini-3.1-flash-tts-preview`, recomendado).
- **Pesos de prioridad** (45/25/15/15) y `UMBRAL_HELADA_DEMO_C = -5` (solo aplica si el boletín no trae nivel de riesgo).
- **Resultados de las pruebas de las 13:00** (audio y PDF).
