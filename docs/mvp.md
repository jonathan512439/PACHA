# MVP aprobado (v2.1, con ajustes del sáb 21/11) — PACHA (sáb 21 nov 2026)

**En una frase:** un bot (WhatsApp, Telegram y un simulador web) que detecta el boletín oficial del Senamhi, prepara la alerta con una tarjeta de "qué hacer" para que una técnica la apruebe, recibe reportes por voz, los convierte en una prioridad pública por comunidad y cierra el ciclo con entregas verificables. La IA solo extrae datos y elige tarjetas de una lista cerrada.

**El MVP está listo cuando** el guion de 4 minutos corre de principio a fin **3 veces seguidas** sobre la demo desplegada. El guion está en `docs/plan.md`.

**Orden de construcción:** `procesarMensaje` + `/probar` → Telegram → WhatsApp al final.

---

## 1. Módulos

### M1 · Bot: una sola función `procesarMensaje(canal, usuario, entrada) → SalidaBot[]`
Canales: web `/probar` (primero), Telegram (segundo) y **WhatsApp (escenario, al final)**. Cada adaptador traduce `SalidaBot` (texto, audio, botones, lista, tarjeta) al formato de su canal.

| Función | Comportamiento | IA |
|---|---|---|
| Registro | Un usuario desconocido, diga lo que diga → bienvenida (texto y audio) → [Sí]/[No] → lista de comunidades → confirmación | No |
| `BAJA` | `activo = false` y confirmación | No |
| Menú (`0`, `menú`, `ALERTA`) | Mapeo fijo, ver tabla abajo | No |
| Audio o texto libre | **1 llamada** `MensajeEntrante` → `intencion` = `reporte` / `pregunta` / `otro` | Sí |
| Pregunta | Gemini elige un id de la lista de tarjetas **`verificada` o `revisada`** → se envía la tarjeta ya escrita (texto, fuente con página, estado y audio). Sin id → mensaje fijo "Consulta al técnico de tu municipio" | Solo elige un id |
| Reporte | "Entendí: … ¿Es correcto?" [Sí]/[No, repetir]. Con **Sí** → `confirmado`, se recalcula la prioridad y se envía la tarjeta cuyo `factor_tags` coincide con el factor del reporte | Extrae datos |
| Confianza < 0,6 | Pide repetir. Al segundo fallo → `revisar` | — |
| Comunidad distinta | "¿El reporte es para A (tu comunidad) o para B?" | No |
| Entrega registrada | "Se registró 1 cisterna para X. ¿Llegó?" [Llegó]/[No llegó] → `confirmed_by_community` | No |
| Protección | 10 mensajes cada 10 min por usuario, audio ≤ 60 s, deduplicación (`inbound_messages`) y verificación de firma del webhook. **Tope global diario** de llamadas a Gemini desde `/probar` y Telegram (`PROBAR_TOPE_DIARIO`): al agotarse se responde con un mensaje fijo y el menú sigue funcionando | No |

**Menú (fijo, sin IA):**
| Opción | Antes | Está pasando ahora |
|---|---|---|
| 💧 Agua | `sequia-antes_familia-01` | `sequia-durante-01` |
| 🦙 Animales | `sequia-antes_animales-01` + `helada-antes_animales-01` | `sequia-durante-01` + `helada-durante-01` |
| 🌱 Cultivos | `helada-antes_familia-01` | `helada-durante-01` |

**Listo cuando:** en `/probar` y en Telegram se hace registro → menú → pregunta → reporte confirmado. WhatsApp hace lo mismo antes del corte del domingo a las 11:45.

### M2 · Boletín → alerta (detección automática y panel)
1. **Detección:** el cron diario de Vercel (1 vez al día, ±59 min en Hobby) o el botón **"Buscar boletín ahora"** llaman a `/api/boletin/buscar`, protegido con `CRON_SECRET`.
   - Esa ruta lee `https://senamhi.gob.bo/meteorologia/agromet-decenal` y toma el enlace **ALTIPLANO** más reciente.
   - Si es nuevo (`source_url` único), lo descarga, lo guarda en Storage y lo procesa con `AvisoGemini`.
2. **Decisión:** `debeAlertar` decide por código.
   - Si corresponde, la alerta queda en `borrador`, con la tarjeta asignada **por regla** (amenaza + fase `antes_*`).
   - Se **avisa a la técnica** por el canal configurado.
3. **Vista previa:** muestra cada dato **junto a su cita textual**, el motivo de la decisión y el mensaje armado con la plantilla.
4. **Envío:** **Aprobar** (`approved_by`) → **Enviar** a los suscriptores activos de las comunidades de esa estación, con el **audio pregenerado de la alerta adjunto por regla** → contador de enviados y fallidos.
- **Respaldo:** subida manual del PDF.
- **Si la búsqueda falla:** la técnica recibe "No se encontró boletín nuevo en 11 días".
- **Alertas de color del Senamhi:** están en una app web interna sin API documentada, así que **no se leen automáticamente**. Se cargan a mano o se pide acceso en el piloto.

**Boletín del demo (real):** Senamhi, Altiplano, **14–23 nov 2026** (1,1 MB, 8 páginas). Para el Altiplano Central (Oruro) dice:
- "Helada puntual y mínimas cercanas al punto de congelación (1 °C en Oruro-Ciudad, Orinoca, Chipaya y Quillacas)".
- **"Riesgo MEDIO por helada tardía y granizadas aisladas en cultivos en emergencia"**.
- "Riesgo MEDIO A ALTO" por erosión eólica o deshidratación de plántulas. Ese riesgo es por **viento**, no por helada.
- "Riesgo BAJO A MEDIO" en ganadería camélida y ovina.

→ **Regla corregida:** `debeAlertar` alerta si el **riesgo de helada** que asigna el boletín es **`medio` o `alto`**. Antes había propuesto "solo alto", y con ese criterio este boletín no generaría alerta.

**Listo cuando:** "Buscar boletín ahora" detecta el boletín del 14–23 nov, prepara la alerta de helada, se aprueba y llega con su audio a los teléfonos del equipo.

### M3 · Reportes y prioridad
- **Prioridad por comunidad** = **el máximo** de sus reportes `confirmado` que no están `atendido`.
  - `horasDesdeReporte` se recalcula al leer.
  - Si falta el dato de familias, se usa el de la comunidad.
  - `revisar` y `descartado` quedan fuera.
- **`/panel/reportes`** muestra la lista por estado, el audio, la transcripción y el JSON. Permite:
  - corregir un dato;
  - **confirmar o descartar** un reporte en `revisar`;
  - **Registrar entrega** con foto, que pasa el reporte a `atendido`.
- **`/panel/prioridad`:** ranking con desglose, fórmula y pesos visibles.

**Listo cuando:** un reporte por voz cambia el color de su comunidad en el mapa en menos de 1 minuto.

### M4 · Entregas
- **Registro:** desde `/panel/reportes`, con cisterna o forraje, cantidad y foto en Storage. El bot pregunta a la comunidad si llegó.
- **`/entregas` (público):** fecha, comunidad, cantidad, foto, confirmación de la comunidad y **la prioridad del reporte que la originó**.

### M5 · Tarjetas (12 redactadas en el Excel de Drive; 6 verificadas como mínimo)
- **Estados:** `borrador` → **`verificada`** (una persona del equipo comprobó cada paso contra la página citada; `verified_by`) → `revisada` (un técnico la revisó; `reviewed_by`).
- **Etiqueta pública:** "Verificada contra fuente" o "Revisada por …". La autoría que se muestra es la de la fuente (`source_doc`).
- **Origen:** el Excel de Drive se carga como `borrador`. El proceso está en `docs/plan.md` §6.
- **Uso:** el bot y el menú solo usan tarjetas `verificada` o `revisada`.
- **Formato:** cada tarjeta tiene audio OGG/Opus mono (WhatsApp y Telegram) y MP3 (web), generados **offline**. Vista A4 con CSS de impresión.

| id | Tema | `factor_tags` | Fuente candidata (C confirma la página) |
|---|---|---|---|
| `sequia-antes_familia-01` | Guardar y cuidar el agua de consumo | `sin_agua_consumo` | CIPCA agua / Practical Action |
| `sequia-antes_animales-01` | Reserva de forraje | `sin_reserva_forraje` | FAO al930s / Helvetas |
| `sequia-durante-01` | Agua y forraje cuando falta | `pozo_o_vertiente_seca`, `sin_agua_consumo` | FAO al930s |
| `helada-antes_familia-01` | Proteger cultivos antes de la helada | `cultivos_sin_proteccion_helada` | PreventionWeb "Cuando hiela" / FAO |
| `helada-antes_animales-01` | Abrigo y corrales | `animales_sin_abrigo` | FAO/MDRyT as-961s (solo cuidados generales) |
| `helada-durante-01` | Durante la helada | `perdida_por_helada` | PreventionWeb "Cuando hiela" |

### M6 · Web pública
`/` (mapa con la alerta activa, su fuente y fecha, comunidades por color, desglose y "¿Cómo se calcula?") · `/alertas/[id]` · `/tarjetas` · `/tarjetas/[id]` · `/tarjetas/[id]/imprimir` · `/entregas` · `/suscribirse` (QR de Telegram y QR `wa.me` con "ALERTA") · `/probar`. Lo que es de ejemplo lleva la etiqueta **EJEMPLO**.

### M7 · Panel (basic auth)
`/panel` (resumen y **Reiniciar demo**) · `/panel/alertas` · `/panel/reportes` · `/panel/prioridad`.

### M8 · Respaldo del demo (responsable: B)
- **Script `seed`:** 8 comunidades EJEMPLO en Toledo, la **"Comunidad de prueba (EJEMPLO)"**, las tarjetas del CSV y 3 entregas de ejemplo con **fotos tomadas por el equipo** (objetos, sin personas, sin imágenes de internet, sin EXIF, con la etiqueta "FOTO DE EJEMPLO"). **No** incluye el boletín de nov.
- **Reiniciar demo:** botón que vuelve a correr el seed.
- **`DEMO_FIXTURES=off|auto|on`:** con `auto`, si Gemini falla o tarda más de 15 s se usa la respuesta guardada del guion; con `on`, siempre se usa el fixture (ensayos 2 y 3).
- **Video** del flujo completo.

### Autenticación: solo el panel
- **Con login (basic auth):** `/panel/*` y las APIs que envían, aprueban o registran.
  - Usuarios en `PANEL_USERS="patricia:…,marco:…"`, así `approved_by` es una persona real.
  - El jurado recibe la contraseña en privado.
- **Sin login:**
  - Comunidades: su número de WhatsApp o Telegram es su identidad.
  - `/probar`: cookie anónima.
  - Web pública: solo agregados, ni teléfonos ni transcripciones.
- **Autenticación invisible:** firma de Meta, `secret_token` de Telegram y `CRON_SECRET`.

---

## 2. Qué hace la IA (solo esto)
1. **`AvisoGemini`**: PDF → datos, `riesgo_helada` y `cita_textual`.
2. **`MensajeEntrante`**: audio o texto → intención, datos del reporte e ids de tarjetas (enum construido en tiempo de ejecución con las tarjetas `verificada` o `revisada`).
3. **TTS offline, en la laptop de C:** 6 tarjetas, bienvenida y **la alerta del boletín del demo**. La generación en vivo de audio para alertas nuevas queda en "si sobra".

Todo lo demás lo decide el **código**, y cada alerta la aprueba un **humano**.

## 3. Cambios de contrato (A los aplica a las 12:30 y avisa al grupo)
1. **Tarjetas:** `status` pasa a `borrador | verificada | revisada`. Se agrega `verified_by` (persona del equipo que comprobó los pasos; no hay campo `author`). `verificada` exige `verified_by` y `revisada` exige `reviewed_by`. Cambia en `tipos.ts` y `schema.sql`.
2. **`MensajeEntrante`** reemplaza a `RespuestaProtocolo`: `{ intencion, reporte | null, tarjeta_ids }`, con ids de tarjetas `verificada` o `revisada`.
3. **`SalidaBot`:** tipo nuevo que comparten los 3 adaptadores. `POST /api/bot/web` recibe `{ tipo: "texto"|"audio"|"boton", texto?, audio?, mime?, botonId? }` y devuelve `SalidaBot[]`.
4. **`subscribers`:** se agregan `estado text` y `activo boolean default true`. `channel` acepta `'web'`, y en la web `channel_user_id` es la cookie de sesión. `alert_deliveries.channel` también acepta `'web'`.
5. **Tabla nueva** `inbound_messages(id text primary key, channel text, received_at timestamptz)`.
6. **Reportes:** `por_confirmar` → `confirmado` → `atendido`, y además `revisar` y **`descartado`** (nuevo).
7. **Prioridad por comunidad** = máximo de los reportes `confirmado` no atendidos. Va como función en `prioridad.ts`.
8. **Boletines y alertas:**
   - `bulletins.source_url text unique`.
   - `AvisoGemini` v0.2 gana `zona`, `riesgo_helada: "bajo"|"medio"|"alto"|null`, `cita_evento` y `cita_riesgo` (literales, ≤ 200 caracteres), que reemplazan a `cita_textual`. Si el boletín da un rango ("MEDIO A ALTO"), se toma el valor superior.
   - `debeAlertar` alerta con `medio` o `alto`.
   - `construirMensajeAlerta` usa la plantilla de `docs/plan.md` §5.1: las palabras del boletín (zona y las dos citas), no solo la temperatura. Sin `cita_evento`, no hay alerta.
   - `alerts.audio_path` lo completa una regla.
9. **`CONTRATOS.md`:** basic auth. Salen `/panel/tarjetas`, `/preguntar`, `/api/og` y el acta en PDF. Los contratos se mueven a `/contratos`.

## 4. Stack y variables
- **Stack:** Next.js (App Router, TS) en Vercel · Supabase (Postgres y Storage) · `@google/genai` · **Zod v4** (`z.toJSONSchema`) · Leaflet con OpenStreetMap (con atribución y `ssr: false`).
- **Fuera del stack:** `next/og`, `@react-pdf/renderer`, ffmpeg en el servidor, ElevenLabs y Supabase Auth.
- **Webhooks:** responder 200 de inmediato y procesar con `after()`.
- **Audio de WhatsApp entrante:** `GET /{media-id}` → URL → descarga con el token.
- **`.env.example`, sin valores:** `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `PANEL_USERS`, `CRON_SECRET`, `TECNICA_CONTACTO` (por ejemplo `telegram:<chat_id>`), `DEMO_FIXTURES`, `PROBAR_TOPE_DIARIO`, `GROQ_API_KEY` (opcional).
- **Audio offline (C):** `ffmpeg -i in.wav -c:a libopus -ac 1 -b:a 32k out.ogg` y `ffmpeg -i in.wav -b:a 64k out.mp3`. Si Gemini TTS entrega PCM crudo, anteponer `-f s16le -ar 24000 -ac 1`.

## 5. Reparto
- **A (backend, IA y bot):**
  - Contratos.
  - Gemini (2 llamadas y fixtures).
  - `procesarMensaje` y `/api/bot/web`.
  - Adaptadores de Telegram y WhatsApp.
  - Búsqueda y procesamiento del boletín, cron, aprobar y enviar.
  - Prioridad y entregas (API); despliegue.
- **B (frontend y respaldo del demo):**
  - Repo, Vercel y Supabase.
  - **Seed y Reiniciar demo.**
  - Basic auth y `/probar`.
  - Mapa y panel (alertas, reportes con registro de entrega, prioridad).
  - Tarjetas y vista A4, `/entregas`, `/alertas/[id]` y `/suscribirse`.
- **C (contenido, pruebas y pitch):**
  - Prueba de audio de las 13:00.
  - Bot de Telegram y app de Meta.
  - CSV de comunidades y de tarjetas (`verificada`).
  - Audios de tarjetas, bienvenida y alerta.
  - Pruebas de voz.
  - README, afiche con QR, presentación y video.

## 6. Fuera del MVP (si sobra, en este orden)
1. Contador por `factor` con sugerencia de reenvío.
2. Aprobación de la técnica por botón de WhatsApp.
3. Foto adjunta al último reporte.
4. TTS en vivo para alertas nuevas.
5. Tarjetas de nevada (hasta llegar a 12).
6. Número propio de WhatsApp.
7. `/panel/tarjetas`.
8. Acta imprimible.
9. Imagen PNG de la tarjeta.
