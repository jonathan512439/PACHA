# Análisis crítico — PACHA (sáb 21 nov 2026, ~12:00)

## 1. Veredicto

La idea es **defendible y oportuna**, pero **el alcance actual no cabe en 10 horas**. Si intentamos todo, el demo queda a medias y perdemos la Viabilidad.
- **Impacto (30): 24–26.** La crisis es de esta semana: el gobernador dijo el 19/11 que **34 de 35 municipios** están afectados y mueren **hasta 130 camélidos al día**. El Senamhi espera lo peor en dic–ene. Hoy la emergencia es la **sequía**, no la helada.
- **Innovación (40): 24 así como está y 30–32 con el reencuadre de la §6.** El riesgo es que el jurado lo vea como "un bot con Gemini". Lo que nos diferencia es el **ciclo cerrado** (alerta → reporte → prioridad pública → entrega con foto), no la IA.
- **Viabilidad (30): unos 15 si construimos todo y 24–26 con el MVP de la §4.**

## 2. Hallazgos

| # | Hallazgo | Sev. | Estado | Recomendación |
|---|---|---|---|---|
| 1 | El alcance (9 tablas, 18 rutas, 2 canales, TTS, OG, PDF, 12 tarjetas) no cabe en unas 10 h con 3 personas | **bloquea** | Estimación propia | Hacer el MVP de la §4 y cortar el resto |
| 2 | Gemini acepta **OGG Vorbis** (`audio/ogg`). WhatsApp y Telegram entregan **OGG Opus**. Ningún documento oficial confirma Opus | alto | NO VERIFICADO ([docs audio](https://ai.google.dev/gemini-api/docs/audio)). Prueba pendiente: `scratch/probar-gemini-audio.mjs` | Probarlo **antes de las 13:00**. Si falla, transcribir con Groq Whisper (25 MB en la capa gratis, [docs](https://console.groq.com/docs/speech-to-text)). **No usar ffmpeg en Vercel** |
| 3 | Cuota gratis de `gemini-3.8-flash`: algunos reportan **unas 20 peticiones al día**. `gemini-3.5-flash-lite`: unas 500 al día. La cuota es **por proyecto** y crear más claves en el mismo proyecto no la aumenta | alto | Los IDs están VERIFICADOS como estables ([3.8-flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), 3.5-flash-lite). Los límites NO VERIFICADOS (fuentes de terceros que se contradicen; [rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)) | Desarrollar con `GEMINI_MODEL=gemini-3.5-flash-lite`. **Cada persona usa su propio proyecto y su propia clave**, y el demo usa otra clave aparte. Guardar respuestas reales como *fixtures* para el frontend. Revisar los límites en AI Studio |
| 4 | WhatsApp: el número de prueba solo envía a **5 destinatarios**. Fuera de la ventana de 24 h solo se pueden enviar **plantillas**. El token temporal **dura 24 h** | alto | VERIFICADO ([Meta get-started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/), [send-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)). La caducidad del token la confirma solo una fuente de terceros | El opt-in con "ALERTA" **abre la ventana de 24 h**, y dentro de ella se puede enviar texto y audio libres. Los 5 teléfonos del equipo escriben "ALERTA" la mañana del demo. Crear un token de *System User*. **Telegram como canal principal en vivo** (BotFather, sin límite de destinatarios) |
| 5 | Una nota de voz saliente de WhatsApp tiene que ser **OGG/Opus mono**. Gemini TTS devuelve PCM, así que hay que convertirlo | medio | VERIFICADO ([audio messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/audio-messages)). El formato PCM de Gemini TTS NO VERIFICADO hoy | Generar los audios **en una laptop con ffmpeg, una sola vez**, y subirlos a Storage. Solo las **tarjetas** llevan audio. La alerta va como texto más el audio de la tarjeta |
| 6 | Vercel: el body de una petición está limitado a **4,5 MB** y la duración máxima en Hobby es **300 s** | bajo | VERIFICADO ([límites](https://vercel.com/docs/functions/limitations)). Un boletín real pesa **371 KB** (medido) | Ningún problema con el PDF. En los webhooks, **responder 200 enseguida** y procesar con `after()` de Next, porque Meta y Telegram reintentan si la respuesta tarda |
| 7 | Gemini acepta datos inline de hasta 100 MB | — | VERIFICADO ([blog Google, ene 2026](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-new-file-limits/)) | Enviar el PDF y el audio inline, sin usar la Files API |
| 8 | En `@google/genai`, `responseJsonSchema` se genera con `z.toJSONSchema()` (Zod v4). `regex` y `min`/`max` se pierden en la conversión | medio | Lo primero VERIFICADO ([structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)). La pérdida de restricciones NO VERIFICADO (lo afirma un post del foro) | Mantener `parse` de Zod sobre la salida, como ya dice el contrato. Fijar **Zod v4**. Hay ejemplos oficiales desactualizados (usan `zod-to-json-schema`) |
| 9 | `RespuestaProtocolo.tarjeta_ids` acepta **cualquier string**, así que Gemini podría inventar un id | alto (seguridad) | Revisión del contrato | Construir en tiempo de ejecución un `z.enum` con los ids existentes y **filtrar solo las tarjetas `revisada`** |
| 10 | Nadie del equipo es técnico agropecuario. `reviewed_by` = C significaría "comparada con la fuente", no "revisada por un experto" | alto (credibilidad) | — | Mostrarlo como **"verificada contra fuente"** y no como "revisada por técnico". La revisión experta se presenta como requisito del piloto |
| 11 | La prioridad se calcula **por reporte**, pero las cisternas se asignan **por comunidad**. Un reporte sin ningún dato puntúa unos 42,5 (amarillo), lo mismo que uno con datos moderados | medio | Revisión de `prioridad.ts` | Ranking por comunidad = su último reporte `confirmado`. Los reportes sin confirmar no entran al mapa |
| 12 | Datos personales: la capa gratuita de Gemini **usa los datos para mejorar los productos de Google** | medio | VERIFICADO para TTS ([The Decoder](https://the-decoder.com/google-ships-its-most-expressive-gemini-3-1-text-to-speech-model-yet-with-70-language-support/)). Es la política general de la capa gratis | En el demo solo voces del equipo. Un piloto real necesita la capa paga. Es buena respuesta para el jurado |
| 13 | Supabase gratis: 500 MB de base de datos, 1 GB de Storage y **pausa tras 1 semana sin actividad** | bajo | VERIFICADO ([pausa](https://supabase.com/kb/faqs/platform/free-project-pausing), [límites BD](https://supabase.com/changelog/33121-relaxing-database-size-limit-on-free-plan-0-5-gb-database-size-per-project)) | Basta para el demo. Avisar en el README que el jurado puede ver el proyecto pausado más tarde |
| 14 | Las cifras del pitch | medio | **34/35 y 130 camélidos al día** VERIFICADO ([Red Uno, 19/11/2026](https://www.reduno.com.bo/noticias/oruro-34-de-35-municipios-estan-afectados-por-la-sequia-y-mueren-hasta-130-camelidos-al-dia-2026111982342)). Es una declaración del gobernador, no un decreto. **Toledo 28–29 comunidades y 4–5 cisternas al día** VERIFICADO ([eju.tv/La Patria](https://eju.tv/?p=5049465)), sin fecha visible. **Papa: hasta 90 % de pérdida** VERIFICADO ([Correo del Sur/CIPCA, 28/06/2026](https://correodelsur.com/sociedad/20260628/heladas-causan-perdidas-de-hasta-90-de-cultivos.html)) en 5 municipios de La Paz y Oruro. **"Miles de camélidos muertos por nevada"**: el conteo oficial de ago-2026 da **897** en 6 departamentos ([Telesur](https://www.telesurtv.net/nevadas-bolivia-afectan-familias/)). **"Más de 1 millón de camélidos"**: hay 955 mil llamas según el INE, Censo 2013 ([INE](https://www.ine.gob.bo/index.php/descarga/219/boletines-estadisticos/38005/oruro-lidera-en-indicadores-educativos-y-produccion-camelida.pdf)), y 1,01 M según otra lectura del mismo censo | Usar "**cerca de 1 millón de llamas (Censo 2013)**", "**897 camélidos muertos en las nevadas de agosto (6 dptos.)**" y "**17.544 familias damnificadas por sequía en Oruro**" ([Visión 360](https://www.vision360.bo/noticias/2026/11/16/77493-crecidas-de-rios-por-lluvias-ponen-en-alerta-a-cuatro-departamentos-y-la-sequia-deja-mas-de-70000-cabezas-de-ganado-perdidas)). **No decir "miles"** |
| 15 | Boletín decenal del Senamhi, macrorregión Altiplano, con tabla por estación (incluye Oruro) | — | VERIFICADO ([jun-2024, 1.ª decena](https://senamhi.gob.bo/agromet/boletines_agrometeorologia/boletines_decenales/2024/JUNIO/1%20DECENA/1%20BOLET%C3%ADN%20ALTIPLANO%202024-06-1.pdf): heladas de -15 a 1 °C) | Ese es el **boletín EJEMPLO** del demo |
| 16 | **Corrección (sáb 12:10):** el Senamhi **sí tiene un enlace de WhatsApp** (`wa.link/gaul7v`) y una app móvil (SenamhiApp), además de SAT-Agro (MDRyT). No verificamos qué envía su WhatsApp | alto (pitch) | VERIFICADO en senamhi.gob.bo | **No decir "no existe un canal"**. Nuestro diferencial: por comunidad, con tarjeta de qué hacer, bidireccional (reportes) y conectado al reparto auditable. Nos presentamos como complemento del Senamhi |
| 17 | Los contratos están en la raíz del proyecto, no en `/contratos`. La carpeta no es un repo git y las plantillas CSV no existen | bajo | Revisado | Moverlos a `/contratos` y hacer `git init` con `.gitignore` antes del primer commit |

## 3. Notas técnicas que no caben en la tabla
- **TTS:** `gemini-3.1-flash-tts-preview` tiene capa gratis pero está en *preview* (VERIFICADO, [docs TTS](https://ai.google.dev/gemini-api/docs/speech-generation)). Recomiendo **saltarse la comparación con ElevenLabs**: es una cuenta y una licencia más, y solo generamos 6 audios. C escucha uno y decide en 10 minutos.
- **Telegram:** las notas de voz son OGG/Opus, `getFile` descarga hasta 20 MB y el link dura 1 h (VERIFICADO por fuentes secundarias).
- **`next/og` y `@react-pdf/renderer`:** son dos librerías más con CSS limitado (NO VERIFICADO hoy). Una sola página HTML con CSS de impresión cubre la tarjeta A4 y el acta.

## 4. MVP mínimo defendible (lo imprescindible)
1. **Boletín → alerta:** subir el PDF → Gemini (`AvisoGemini`) → `debeAlertar` → mensaje por plantilla con la `cita_textual` visible → botón **Aprobar** → envío por Telegram (y a los números de WhatsApp del equipo si está listo).
2. **Reporte por voz:** nota de voz → transcripción y JSON (`ReporteGemini`) → "¿Entendí bien? SÍ/NO" → se guarda con prioridad y desglose. Si la confianza es menor a 0,6, queda en `revisar`.
3. **Mapa `/`:** comunidades EJEMPLO coloreadas por prioridad, con la alerta activa (fuente y fecha). **`/panel/prioridad`** con la fórmula y el desglose.
4. **`/entregas`:** el panel registra la entrega con foto y aparece en el tablero público.
5. **6 tarjetas** (sequía ×3 y helada ×3) con fuente y página, más audio pregenerado y la vista imprimible A4.
6. **Panel protegido con contraseña** (basic auth por middleware, 15 min) en lugar de Supabase Auth.

**Cortado (solo si sobra tiempo, en este orden):** contador de `factor` con sugerencia de tarjeta (es casi un `GROUP BY`, lo primero que se recupera) → WhatsApp completo → `/preguntar` en el bot → 6 tarjetas más (nevada) → imagen PNG de la tarjeta → acta PDF → `/suscribirse` como formulario (por ahora basta una página con instrucciones).

## 5. Alternativas al stack
- **Mantener Next + Vercel + Supabase.** Para este equipo no hay nada más rápido: la base de datos, el Storage y la API ya están hechos, y Vercel despliega en cada push.
- **Recortar:** Supabase Auth se reemplaza por basic auth. `next/og` y `react-pdf` por CSS de impresión. ElevenLabs no se usa. ffmpeg no va en el servidor. Groq solo entra si falla la prueba del audio.
- **Telegram primero y WhatsApp después**, los dos detrás de `enviar(canal, msg)`. El webhook de Telegram se configura en 5 minutos.

## 6. Cambios para subir la Innovación sin añadir riesgo
1. **Liderar con la sequía de hoy.** El ciclo de reporte, prioridad pública y entrega con foto es exactamente lo que la Gobernación está repartiendo (Bs 5 M en forraje). La helada entra como ejemplo de alerta con un boletín histórico.
2. **Nombrar el diferencial:** "**reparto auditable**". Cualquier vecino ve por qué su comunidad está 3.ª y qué se entregó. Ningún SAT hace eso.
3. **La IA es la pieza más pequeña y está encerrada:** extrae datos, el código decide y un humano aprueba. Mostrar la `cita_textual` junto al dato extraído en la vista previa: hace visible la verificación.
4. **Última milla sin smartphone:** la tarjeta A4 impresa para el técnico municipal o la radio comunitaria, y el audio para quien no lee. No requiere código extra.

## 7. Preguntas difíciles del jurado
1. **¿Por qué no usar directamente el Senamhi?** Lo retransmitimos con fuente y fecha. Lo que agregamos es la última milla: por comunidad, por voz, con qué hacer, y conectado a la respuesta.
2. **¿Y si la IA se equivoca?** La IA no decide ni aconseja. Extrae datos, Zod valida, el código decide, un humano aprueba viendo la cita textual, y los consejos salen solo de tarjetas con fuente.
3. **¿Quechua y aymara?** Gemini transcribe audio mixto. Si la confianza es baja, el reporte va a `revisar` y lo atiende una persona. No hacemos traducción automática a propósito, por el riesgo. En el futuro, audios grabados por voces locales.
4. **¿Pueden inflar su prioridad?** Solo entran reportes confirmados por un técnico. La fórmula es pública y las entregas llevan foto y confirmación de la comunidad.
5. **¿Datos personales?** Opt-in. Los teléfonos están solo en la base de datos, nunca en el repo. En producción, la capa paga de Gemini, que no usa los datos para entrenar.
6. **¿Quién revisa las tarjetas?** Hoy las comparamos contra la fuente oficial, página por página. Para el piloto, la revisión de un técnico es requisito antes de enviarlas.
7. **¿Costo y sostenibilidad?** El demo cuesta 0. A escala, el costo principal son las plantillas de WhatsApp por mensaje (precio NO VERIFICADO) y Gemini flash-lite, que es barato. Está pensado para que lo opere un municipio.
8. **¿No es solo un bot con Gemini?** El bot es la entrada. El producto es el ciclo auditable de alerta, reporte, prioridad y entrega.

## 8. Demo de 4 minutos
| Min | Qué se ve |
|---|---|
| 0:00–0:40 | Problema con 3 cifras verificadas (34/35 municipios, 130 camélidos al día, Toledo con 4–5 cisternas para 28 comunidades). "El aviso existe, pero no llega como acción." |
| 0:40–1:40 | Panel: subir el boletín EJEMPLO → "Procesar" → datos extraídos con la cita textual → mensaje por plantilla → **Aprobar** → suena el teléfono (Telegram) con texto, fuente, fecha y audio de la tarjeta |
| 1:40–2:40 | Un compañero responde con una nota de voz ("hace 6 días no hay agua, 40 familias") → "¿Entendí bien?" → SÍ → el mapa cambia de color y se abre el desglose de la prioridad |
| 2:40–3:20 | Se registra la entrega de una cisterna con foto → aparece en `/entregas` (público) |
| 3:20–4:00 | Tarjeta A4 impresa en la mano. Qué hace y qué no hace la IA. Piloto para un municipio. Cierre |

**Plan B:** (a) **video grabado del flujo completo** el sáb a las 18:00, actualizado el dom a las 12:30. (b) Variable `DEMO_FIXTURES=1`: si Gemini falla, el sistema usa los JSON reales ya guardados. (c) Si falla WhatsApp, usar Telegram, y si falla Telegram, mostrar el flujo del bot desde el panel. (d) Si falla internet, hotspot del celular más el video local. (e) Base de datos precargada con un script `seed`.
