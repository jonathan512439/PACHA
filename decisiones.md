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
- **Audio:** pendiente. Falta una nota de voz de WhatsApp o Telegram (C).

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

## Pendientes
- **Ilustraciones de las tarjetas** (A las está generando): se discuten cuando estén listas. Regla vigente: son decorativas, sin texto con consejos, y se marcan "Ilustración generada con IA".
- **PDF faltantes para verificar:** FIDA PRO-CAMÉLIDOS (6 tarjetas) y Practical Action (2 tarjetas).
- **Tarjeta T-07, paso 2** ("Reduce el tamaño del hato…"): no aparece en las páginas citadas de al930s. Hay que corregirlo o quitarlo.
- **Numeración de páginas:** usar la del visor de PDF; comprobar cuál usa el Excel.
- **Límite real de `gemini-3.5-flash-lite`** (A, 13:00) y valor de `PROBAR_TOPE_DIARIO`.
- **Voz definitiva:** Gemini TTS (`gemini-3.1-flash-tts-preview`, recomendado).
- **Pesos de prioridad** (45/25/15/15) y `UMBRAL_HELADA_DEMO_C = -5` (solo aplica si el boletín no trae nivel de riesgo).
- **Resultados de las pruebas de las 13:00** (audio y PDF).
