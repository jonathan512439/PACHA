# Plan hora por hora (v2) — sáb 21 nov 12:30 → dom 22 nov 16:30

Referencias: `docs/mvp.md` (qué se construye), `docs/flujos-de-uso.md` (cómo se usa) y `decisiones.md`.

**Supuestos:**
- Solo cuentan los horarios oficiales: sáb 12:30–13:00, 14:15–16:30 y 17:00–18:00; dom 9:00–12:30. El dom de 14:00 a 16:30 es **solo para correcciones**. Eso da **unas 7 horas de construcción por persona**. Cualquier hora extra es colchón, no plan.
- Las claves y los tokens se pasan **por mensaje privado** y van a `.env.local` y a Vercel. Nunca al repo ni al chat del grupo.
- **Claves de Gemini:**
  - Cada persona usa **su clave personal** en `.env.local` y en los despliegues *preview*.
  - La **clave del demo** existe **solo en las variables de Producción** de Vercel y **no se usa nunca en desarrollo**.
  - A confirma el límite real de `gemini-3.5-flash-lite` en AI Studio a las 13:00 y lo anota en `decisiones.md`.

---

## 1. Bloques

### Sáb 12:30–13:00 · Arranque
| Persona | Tareas | Entrega |
|---|---|---|
| **A** | 1. **Primero `schema.sql`**, para que B lo aplique: tarjetas con `verified_by` (sin `author`), estados `borrador`/`verificada`/`revisada`, `descartado`, `inbound_messages`, `source_url`, `subscribers.estado`/`activo` y canal `web`. 2. `tipos.ts`: `AvisoGemini` v0.2 (zona, `riesgo_helada`, `cita_evento`, `cita_riesgo`), `MensajeEntrante`, `SalidaBot`, nueva plantilla de alerta y `debeAlertar` con medio/alto. Puede terminarlo a las 14:15. 3. **Confirmar la cuota** de flash-lite en AI Studio | `schema.sql` v0.2 a las 12:45. Cuota anotada |
| **B** | 1. **Proyecto Supabase** y **aplicar `schema.sql`** en cuanto A lo pase. 2. Si hay tiempo: `git init`, `.gitignore` y `create-next-app`. Si no, a las 14:15 | Esquema aplicado |
| **C** | 1. **Prueba de audio y de PDF** (§4) con su clave personal. 2. Si hay tiempo: bot de Telegram (@BotFather) y cuenta de Meta | Resultados en `decisiones.md` y fixture `aviso-altiplano-2026-11-2.json` |

**Control 13:00, mínimo que bloquea:** prueba de audio y de PDF ✔ · esquema en Supabase ✔ · contratos ✔.
**Pueden llegar hasta las 14:30:** repo, Vercel, bot de Telegram y número de Meta.

### Sáb 13:00–14:15 · Almuerzo

### Sáb 14:15–16:30 · Núcleo del bot, `/probar` y tarjetas
| Hora | A | B | C |
|---|---|---|---|
| 14:15–14:30 | Revisar con B `SalidaBot` y `/api/bot/web` (15 min). Terminar `tipos.ts` si quedó pendiente | Repo **público**, `.gitignore` (`.env*` salvo `.env.example`, `.vercel`, `node_modules`, audios de prueba), Next, Vercel y variables. Revisión de contratos con A | Bot de Telegram y app de Meta: número de prueba, **3 destinatarios** y token → A por privado |
| 14:30–15:30 | `lib/gemini.ts`: `MensajeEntrante` y `AvisoGemini` (`z.toJSONSchema` y `parse`). Fixtures con `DEMO_FIXTURES=off\|auto\|on`. Ruta de audio según la prueba de las 13:00 | **Seed** (con o sin tarjetas) y **Reiniciar demo**. Basic auth con `PANEL_USERS` | **Tarjetas:** convertir el Excel de Drive a CSV (ver §6). CSV de comunidades: 8 EJEMPLO en Toledo y "Comunidad de prueba (EJEMPLO)" |
| 15:30–16:30 | `procesarMensaje` completo (registro, `BAJA`, menú fijo, pregunta, reporte con confirmación, tarjeta por factor, confianza baja y comunidad distinta). `POST /api/bot/web` con **tope global diario** | **`/probar`**: chat, botones y grabación (formato según la prueba). Primero con respuestas simuladas y luego conectado a la API real (unos 16:15) | **Verificación** de las 6 tarjetas del menú por una persona distinta del autor (§6). **3 fotos de entregas de ejemplo** (§7) |

**Control 16:30:** en `/probar` (producción) funciona registro → menú → pregunta → reporte confirmado guardado **con Gemini real**. Seed cargado. Al menos 3 tarjetas `verificada`.

### Sáb 16:30–17:00 · Descanso

### Sáb 17:00–18:00 · Telegram, mapa y audios
| A | B | C |
|---|---|---|
| **Adaptador de Telegram:** `setWebhook` con `secret_token`, `after()`, `getFile`, teclado *inline*, `sendVoice` y deduplicación. El tope diario aplica también a Telegram (lo usa el jurado) | **Mapa `/`:** Leaflet con `ssr: false` y atribución de OSM. Color por el máximo de los reportes confirmados no atendidos. Desglose y "¿Cómo se calcula?" | **Audios:** tarjetas `verificada` y bienvenida → ffmpeg → `.ogg` y `.mp3` → Storage. Pruebas de voz en `/probar` (5 casos) |

**Control 18:00:** el bot de Telegram hace lo mismo que `/probar`. Un reporte cambia el color en el mapa. 6 tarjetas `verificada` con audio. **Primer video.**
**Si algo no llegó a este control, se cortan ya**, sin esperar al domingo: `/alertas/[id]`, `/suscribirse` completo (queda solo el QR) y la vista A4 pasan a "si sobra". B usa ese tiempo para cubrir lo que faltó.

### Dom 9:00–12:30 · Boletín, panel, WhatsApp y entrega
| Hora | A | B | C |
|---|---|---|---|
| 9:00–10:00 | **Boletín:** `/api/boletin/buscar` → descarga → Storage → `AvisoGemini` v0.2 (el fixture del sábado sirve como caso de prueba) → `debeAlertar` (medio o alto) → alerta `borrador` con **la plantilla nueva** (§5.1) y la tarjeta por regla → aviso a la técnica. `vercel.json` con el cron y `CRON_SECRET` | **`/panel/alertas`:** "Buscar boletín ahora", subida manual, vista previa (dato, cita y motivo), mensaje, tarjeta, Aprobar, Enviar y contador | **README:** qué es, cómo correrlo, variables, decisiones, límites honestos y créditos de las fuentes y de OSM. **Afiche A4** con QR |
| 10:00–10:30 | **Aprobar y enviar** por los adaptadores web y Telegram, con el audio de la alerta adjunto por regla y `alert_deliveries` | **`/panel/reportes`:** lista, audio, transcripción, corregir, **confirmar o descartar** los `revisar` y **Registrar entrega** con foto | **Audio de la alerta** a partir del texto final de la plantilla → Storage. Verificar las 6 tarjetas restantes si sobra tiempo |
| 10:30–11:00 | **Entregas (API):** registrar → `atendido` → "¿Llegó?" → `confirmed_by_community` | `/panel/prioridad` y `/entregas` | Pruebas en producción con la lista del §3 |
| 11:00–11:45 | **Adaptador de WhatsApp:** verificación GET, firma `X-Hub-Signature-256`, media, texto, botones, lista, audio y límite de mensajes | `/tarjetas` y `/tarjetas/[id]` con su etiqueta. Si no se cortó a las 18:00: vista A4 y `/alertas/[id]` | Presentación (cifras con fuente) |
| 11:45–12:15 | **Corte de WhatsApp** (§2). Si funciona, probarlo con los 3 teléfonos | `/suscribirse` (QR), etiquetas EJEMPLO y revisión en el celular | Presentación (continúa) |
| 12:15–12:30 | Variables finales en Vercel (clave del demo solo en Producción) y último deploy | Revisión visual | **Video final** en producción |

**Control 12:30: congelado de funciones.**

### Dom 12:30–14:00 · Descanso

### Dom 14:00–16:30 · Solo correcciones
| Hora | Todo el equipo |
|---|---|
| 14:00 | **Ensayo 1** en producción **con Gemini real** (clave del demo), con cronómetro y siguiendo el §5. C anota los fallos |
| 14:20–15:00 | Corregir **solo** lo que falló en el guion |
| 15:00 | **Ensayo 2** con `DEMO_FIXTURES=on` · 15:20 correcciones · 15:40 **Ensayo 3** con `DEMO_FIXTURES=on`. Al terminar, volver a `auto` |
| 15:50 | **Revisión del repo:** `git log -p \| grep -nE "AIza\|EAA[A-Za-z0-9]\|[0-9]{8,10}:[A-Za-z0-9_-]{30,}\|service_role"` sin resultados. `.env.example` sin valores. Ningún teléfono en el código ni en el seed. Las fotos del seed sin datos EXIF |
| 16:00–16:15 | **Entrega:** enlace al repo, enlace a la demo y video |
| 16:30 | Cierre |

---

## 2. Dependencias y líneas de corte

**Dependencias críticas:**
- `schema.sql` (A, 12:45) → esquema en Supabase (B, 13:00) → seed (B) → todo lo demás.
- `SalidaBot` y `/api/bot/web` (A y B, 14:15) → `/probar` (B).
- Excel de tarjetas convertido y verificado (C, 14:30–16:30) → seed → menú y preguntas (A).
- Prueba de audio y de PDF (C, 13:00) → audio en `procesarMensaje` y `/probar`; el fixture del boletín → desarrollo del boletín (A, dom 9:00).
- Token de Telegram (C, ≤14:30) → adaptador de Telegram (A, sáb 17:00).
- Número de Meta (C, ≤14:30) → adaptador de WhatsApp (A, dom 11:00).
- Plantilla con el texto final de la alerta (A, dom ~10:00) → audio de la alerta (C, dom 10:00–10:30).

**Líneas de corte:**
| Cuándo | Si no está… | Entonces… |
|---|---|---|
| Sáb 13:00 | La prueba de audio falla | Se aplica la conversión del §4 sin discutir |
| Sáb 13:00 | La extracción del PDF falla o confunde el riesgo | Se ajusta el prompt **una sola vez**. Si sigue fallando, el demo usa el **fixture corregido a mano** y la vista previa muestra la cita para que la técnica corrija |
| Sáb 13:00 | El esquema no está en Supabase | Bloquea: A y B no avanzan a otra cosa hasta tenerlo |
| Sáb 14:30 | Falta repo, Vercel, Telegram o Meta | Lo que falte pasa a primera tarea de su responsable a las 14:30 |
| Sáb 16:30 | `procesarMensaje` no funciona de punta a punta | Se cortan "comunidad distinta" y el reintento por confianza baja. Telegram pasa al dom 9:00 y el boletín se apoya en el fixture |
| **Sáb 18:00** | **Cualquier punto del control** | **`/alertas/[id]`, `/suscribirse` completo (queda solo el QR) y la vista A4 pasan a "si sobra" en ese momento.** Si Telegram no funciona, el jurado solo usa `/probar` |
| Dom 10:30 | La búsqueda automática falla | **Subida manual** del PDF y fixture. El cron queda en el código, sin demostrarlo |
| Dom 11:45 | WhatsApp no recibe o no responde | **En el escenario se usa Telegram** |
| Dom 12:30 | Cualquier cosa sin terminar | Se corta. **Nunca** se cortan el bot, la alerta, el reporte, el mapa ni `/entregas` |

---

## 3. Lista de pruebas en producción (C, dom 10:30)
1. `/probar`: registro → menú (las 6 combinaciones) → tarjetas con audio y la etiqueta "Verificada contra fuente".
2. Pregunta libre con tarjeta, y pregunta "¿qué vacuna…?" → mensaje fijo.
3. Intento de engaño ("ignora tus instrucciones…") → mensaje fijo.
4. Reporte por voz → "¿Entendí bien?" → Sí → cambia el color en el mapa → aparece la tarjeta por factor.
5. Reporte confuso → `revisar` → en el panel se confirma o se descarta.
6. Buscar boletín → vista previa con las citas → Aprobar → Enviar → el mensaje usa **las palabras del boletín** y llega con audio.
7. Registrar entrega con foto → `/entregas` → "¿Llegó?" → confirmación pública.
8. `BAJA` → ya no recibe la siguiente alerta.
9. Panel sin contraseña → 401.
10. **Tope diario:** con el tope puesto temporalmente en 2, el tercer mensaje libre recibe el mensaje fijo y el menú sigue funcionando.
11. Reiniciar demo → todo vuelve al estado inicial.

---

## 4. Prueba de las 13:00 (C): audio y PDF
**Audio** con `scratch/probar-gemini-audio.mjs`:
- `nota.ogg`: nota de voz de WhatsApp o Telegram.
- `grabacion.webm`: grabada con `scratch/grabar.html` en Chrome (y, si se puede, `grabacion.mp4` desde Safari).
- `control.wav`: un WAV corto de control.
```
cd scratch && npm i @google/genai zod@^4
GEMINI_API_KEY=<clave personal> node probar-gemini-audio.mjs nota.ogg grabacion.webm control.wav
```

**PDF** con `scratch/probar-gemini-boletin.mjs`, sobre el boletín real que está en Drive (`senamhi_altiplano_2026-11-14_2026-11-23.pdf`):
```
GEMINI_API_KEY=<clave personal> node probar-gemini-boletin.mjs senamhi_altiplano_2026-11-14_2026-11-23.pdf
```
- Extrae la zona (Altiplano Central), `riesgo_helada`, `cita_evento` y `cita_riesgo`, y guarda el **fixture** en `scratch/fixtures/aviso-altiplano-2026-11-2.json` (pasa al repo en `/fixtures`).
- **Resultado esperado:** `riesgo_helada = "medio"`. La regla de rango ("MEDIO A ALTO" → `alto`) está en el prompt, pero en este boletín ese rango corresponde al **viento**. Si sale `alto`, Gemini confundió las filas, y eso se corrige antes del demo.
- Si hay `pdftotext`, el script comprueba que las citas aparezcan **literalmente** en el PDF.

**Conversión de audio si un formato no se acepta** (sin ffmpeg en el servidor):
| Falla | Solución | Costo |
|---|---|---|
| WebM o MP4 del navegador | `/probar` graba **WAV mono a 16 kHz** con Web Audio API. 60 s ≈ 1,9 MB, por debajo de los 4,5 MB de Vercel | unos 30 min de B |
| OGG/Opus de los canales | 1) Groq Whisper → texto → `MensajeEntrante`. 2) `ffmpeg-static` dentro de la función | 30 a 45 min de A |

**Cuota (A, 13:00):** anotar el límite real de peticiones por minuto y por día. Con eso se fija `PROBAR_TOPE_DIARIO` = límite diario − 100 (reservadas para el boletín y el demo en vivo). Al agotarse el tope, el bot responde "El simulador llegó a su límite de hoy. Escribe 0 para usar el menú", y **el menú sigue funcionando** porque no usa IA.

---

## 5. Guion del demo (3:40)
**Preparación:** la pantalla muestra el panel. El teléfono se proyecta. A está en el panel, B en el teléfono y C narra.

| Tiempo | Qué pasa | Quién |
|---|---|---|
| 0:00–0:30 | **Problema:** "34 de 35 municipios de Oruro en emergencia por sequía, hasta 130 camélidos muertos al día (gobernador, 19/11). En Toledo, 4 a 5 cisternas al día para 28 comunidades. El Senamhi publica la información, pero en PDF y por macrorregión." | C |
| 0:30–1:25 | **Alerta:** "Buscar boletín ahora" → **boletín real del 14–23 nov** → vista previa con las citas → "Se alerta: riesgo medio de helada" → mensaje con las **palabras del Senamhi** → **Aprobar** → **Enviar** → el teléfono recibe el texto y el audio | A y C |
| 1:25–2:25 | **Reporte:** nota de voz: "Hace seis días que la vertiente está seca, somos cuarenta familias" → "¿Entendí bien?" → ✅ → tarjeta `sequia-durante-01` → **el mapa cambia de color** → desglose | B y A |
| 2:25–3:00 | **Rendición de cuentas:** Registrar entrega con foto → `/entregas` → "¿Llegó?" → ✅ → confirmación pública | A y B |
| 3:00–3:20 | **Seguridad (20 s):** "¿qué vacuna le pongo a mis alpacas?" → respuesta fija. "La IA solo lee y elige; una persona aprueba cada alerta." Si vamos atrasados, **esto pasa a la ronda de preguntas** | C |
| 3:20–3:40 | **Cierre:** "Piloto pensado para un municipio. Boletín real, comunidades de ejemplo. Pruébenlo: QR de Telegram o `/probar`." Se muestra la tarjeta impresa (si existe la vista A4) | C |

Quedan 20 s de margen sobre los 4 min.

### 5.1 Plantilla del mensaje de alerta (código, no IA)
```
Aviso de helada · Senamhi, boletín agrometeorológico decenal del Altiplano, {periodo_inicio} al {periodo_fin}.
Zona: {zona}.
El boletín dice: "{cita_evento}".
Riesgo según el Senamhi: "{cita_riesgo}".
Qué hacer: 1) {paso1} 2) {paso2} 3) {paso3}
(Tarjeta verificada contra fuente: {source_doc}, pág. {source_page})
Mensaje con voz sintética. Si hay daños, responde con un audio.
```
Las dos citas son **literales** y la técnica las ve junto al PDF antes de aprobar. Si una cita es `null`, esa línea no se envía, y la alerta solo puede salir si hay al menos `cita_evento`.

### Lista previa al demo
**T-30 min:**
- Regenerar el token de WhatsApp, actualizarlo en Vercel y redeploy. Comprobar con un mensaje.
- **Reiniciar demo.** El seed **no** incluye el boletín de nov, para que "Buscar boletín ahora" lo detecte en vivo.
- `DEMO_FIXTURES=auto`.
- Pestañas con sesión iniciada: `/panel/alertas`, `/`, `/panel/reportes` y `/entregas`.
- Teléfonos cargados, volumen alto y sin modo "no molestar".
- Hotspot probado.
- Video en dos laptops y en un USB.
- Contraseña del panel para el jurado, impresa.

**T-5 min:**
- **Los 3 teléfonos escriben "ALERTA"** para abrir la ventana de 24 h.
- En el panel se comprueban **3 suscriptores activos**.

**Jurado:** QR de **Telegram** y de **`/probar`** en la última diapositiva. Sus reportes caen en la "Comunidad de prueba (EJEMPLO)".

### Plan B
| Falla | Acción |
|---|---|
| WhatsApp no entrega | El mismo guion por **Telegram** |
| Telegram también falla | **`/probar`** en el navegador |
| Gemini da error o tarda más de 15 s | `DEMO_FIXTURES=auto` responde con el fixture del guion |
| La web del Senamhi no responde | **Subida manual** del PDF (ya está en Storage y en Drive) con su fixture |
| Vercel o Supabase caídos | **Video**, narrado en vivo |
| Falla el internet de la sala | Hotspot. Si tampoco hay, video local |
| Falla la laptop o el proyector | Segunda laptop |

---

## 6. Tarjetas: del Excel de Drive al seed (C, sáb 14:30–16:30)
**Origen:** Drive › DATOSPROYECTO › `tarjetas_que_hacer_altiplano_verificado.xlsx`. Trae 12 tarjetas (T-01 a T-12: 3 amenazas × 4 fases), con 10 a 13 palabras por paso y `factor_tags` válidos.

**Lo que hay que corregir antes de cargarlas:**
1. **Ids:** pasar al formato del contrato. T-01 → `helada-antes_familia-01`, T-02 → `helada-antes_animales-01`, T-03 → `helada-durante-01`, T-04 → `helada-despues-01`, T-05 → `sequia-antes_familia-01`, T-06 → `sequia-antes_animales-01`, T-07 → `sequia-durante-01`, T-08 → `sequia-despues-01`, T-09 a T-12 → `nevada-…-01`.
2. **Estado:** el Excel dice "revisado" con revisor "Verificación Documental". Eso no es una persona ni una revisión técnica. **Todas entran como `borrador`.** No hay campo de autor: se muestra la fuente (`source_doc`).
3. **Verificación** (`verified_by` = nombre de quien comprueba): por cada paso, abrir el PDF en la página citada y comprobar que la frase está ahí. Si no está, se corrige el paso con una frase que sí esté o la tarjeta sigue en `borrador`. Recién entonces pasa a `verificada`.
4. **Primero las 6 tarjetas del menú:** T-01, T-02, T-03, T-05, T-06 y T-07. Las otras 6 se verifican el domingo si sobra tiempo.
5. **Páginas:** se usa el número del **visor de PDF**, para que `source_url#page=N` abra exactamente esa página. Hay que comprobar si el Excel usa ese número o el impreso en la hoja.

**Hallazgos de una revisión al azar (sáb, al930s, mismo archivo que el de Drive):**
- T-07 paso 2 ("Reduce el tamaño del hato priorizando hembras reproductoras y crías") **no aparece** en las páginas citadas (33, 51 y 54 del visor). La 33 trata de selección de reproductores, y la 51 y la 54 de prácticas agrícolas. **Hay que corregirlo o quitarlo.**
- La palabra "escarcha" (T-03 paso 3) **no aparece en ninguna página** de al930s. Hay que comprobarla en el Atlas "Cuando hiela" (págs. 133 y 136).
- **Faltan en Drive** los PDF de **FIDA PRO-CAMÉLIDOS** (citado en T-02, T-04, T-06, T-10, T-11 y T-12) y de **Practical Action** (T-05 y T-09). Sin el PDF, esos pasos no se pueden verificar.

## 7. Fotos de entregas del seed (C, sáb 16:00–16:30)
- 3 fotos **tomadas por el equipo**, de objetos: un bidón o tanque de agua, un fardo o bolsa de forraje y una cisterna o turril. **Sin personas, sin placas ni rostros, y sin imágenes de internet.**
- **Quitar los datos EXIF** (la ubicación GPS del celular) antes de subirlas, por ejemplo con `exiftool -all= foto.jpg` o exportándolas de nuevo.
- Cada foto lleva la etiqueta "FOTO DE EJEMPLO" en `/entregas`.
