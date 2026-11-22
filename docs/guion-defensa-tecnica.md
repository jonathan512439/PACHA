# Guion de defensa técnica · PACHA

**Para:** el equipo que defiende el pitch ante el jurado · **Estado:** sistema en producción en `pacha-lilac.vercel.app` (dom 22/11)
**Cómo usarlo:**
- **Sección 1:** lo que se dice en voz alta (unos 60 s de técnica dentro del pitch).
- **Secciones 2 a 8:** para entender el sistema de punta a punta.
- **Sección 9:** respuestas cortas a las preguntas difíciles.

---

## 1. Lo que se dice en voz alta (≈ 60 s)

> "PACHA es un **monolito modular** sobre Next.js, desplegado en Vercel, con Supabase como base de datos y almacenamiento.
> Una sola base de código, separada por dominios: el **bot**, los **canales** (WhatsApp, Telegram y web), las **alertas del Senamhi**, las **tarjetas verificadas**, la **prioridad pública** y el **panel**.
>
> El corazón es una sola función, `procesarMensaje`, que **no sabe de qué canal viene el mensaje**. Cada canal es un **adaptador** que traduce a un formato común. Por eso agregar WhatsApp no nos obligó a reescribir el bot.
>
> La IA (Gemini) **no escribe consejos**. Hace dos cosas: **lee** el boletín del Senamhi y **entiende** el audio de la comunidad. Devuelve datos validados contra un contrato, y solo puede elegir tarjetas de una **lista cerrada**. Lo que se envía ya está escrito, con fuente y página, y **cada alerta la aprueba una persona**.
>
> Elegimos tecnologías que un equipo de cuatro personas puede operar sin servidores propios, con costo inicial cero y datos en Postgres de verdad, para que el día que un municipio lo adopte pueda llevárselo."

---

## 2. Qué tipo de arquitectura es

### 2.1 Monolito modular, serverless, *contract-first*
| Rasgo | Qué significa en PACHA |
|---|---|
| **Monolito** | Un solo proyecto (Next.js 16) y un solo despliegue: páginas, API, webhooks, cron y panel viven juntos |
| **Modular** | El código se separa por **dominio**, no por capa técnica: `lib/bot`, `lib/canales`, `lib/alertas` + `lib/boletin`, `lib/tarjetas`, `contratos/prioridad`, `lib/visibilidad`, `lib/sesion`. Cada módulo expone pocas funciones y los demás solo usan esas |
| **Serverless** | Vercel ejecuta cada ruta como una función bajo demanda: no hay servidor encendido ni que mantener |
| **Backend como servicio** | Supabase da Postgres administrado y Storage de archivos |
| **Contract-first** | `contratos/` es la fuente de verdad: los tipos y validaciones (Zod), el esquema SQL y la fórmula de prioridad se definieron **antes** del código y todo el sistema los importa |

### 2.2 Por qué no microservicios
- **Equipo y tiempo:** 4 personas y un fin de semana. Los microservicios multiplican despliegues, redes, versiones y fallos parciales; nada de eso aporta a este problema.
- **Volumen:** decenas o cientos de comunidades por municipio. Un monolito bien partido lo atiende de sobra.
- **El monolito modular deja la puerta abierta:** si un módulo crece (por ejemplo, el envío masivo de alertas), se extrae como servicio sin reescribir el resto, porque ya tiene su frontera.

### 2.3 Mapa del sistema
```
 Comunidades                                   Público (transparencia, sin login)
 WhatsApp · Telegram · /probar (web)            /  mapa · /comunidad/[id] · /tarjetas · /fuentes
      │  voz o texto                            /entregas · /resumen · /suscribirse
      ▼                                                       ▲
 ┌──────────────── Next.js 16 en Vercel (un solo despliegue) ─┼───────────────────────┐
 │  Adaptadores de canal (lib/canales)                         │                       │
 │   telegram.ts · whatsapp.ts · /api/bot/web                  │  Server Components    │
 │        │  EntradaBot (formato común)                        │  (lib/datos-publicos, │
 │        ▼                                                    │   lib/visibilidad)    │
 │  procesarMensaje (lib/bot) ── Gemini: entender audio/texto  │                       │
 │        │  SalidaBot (texto, botones, lista, tarjeta, audio) │                       │
 │        ▼                                                    │                       │
 │  Tarjetas verificadas (lib/tarjetas) · Prioridad (contratos/prioridad)              │
 │                                                                                     │
 │  Cron diario ─► /api/boletin/buscar ─► Gemini lee el PDF ─► alerta en BORRADOR      │
 │  Panel (/panel, con login) ─► aprobar ─► enviar por canal ─► registrar entrega      │
 └──────────────────────────────┬──────────────────────────────────────────────────────┘
                                ▼
            Supabase: Postgres (11 tablas, RLS) + Storage (audios, imágenes, fotos, PDF)
```

---

## 3. Patrones de diseño (con dónde están)
| Patrón | Dónde | Para qué |
|---|---|---|
| **Adaptador (puertos y adaptadores)** | `lib/canales/telegram.ts`, `whatsapp.ts`, `/api/bot/web` ↔ `lib/bot/procesar.ts` | El bot habla un idioma propio (`EntradaBot` / `SalidaBot`). Cada canal traduce. Un canal nuevo (SMS, IVR) es un adaptador más |
| **Núcleo puro, borde impuro** | `contratos/prioridad.ts`, `lib/problemas-agrupar.ts`, `lib/visibilidad-calculo.ts` | Los cálculos importantes son funciones puras, sin base de datos, y se prueban al 100 %. La base de datos queda en el borde |
| **Capa de acceso a datos** | `lib/bot/datos.ts`, `lib/datos-publicos.ts`, `lib/visibilidad.ts` | Ninguna página consulta la base directamente. Las consultas públicas **nunca** devuelven teléfonos ni transcripciones |
| **Máquina de estados** | Alertas: `borrador → aprobada → enviada / descartada`. Reportes: `por_confirmar → confirmado → atendido` (+ `revisar`, `descartado`). Tarjetas: `borrador → verificada → revisada` | Cada transición está controlada en el código **y** en la base (restricciones SQL). Nada se envía sin `aprobada` |
| **Humano en el circuito** | Aprobación de alertas, verificación de tarjetas, confirmación de reportes por la propia comunidad | La IA propone, una persona decide |
| **IA como extractor con salida restringida** | `lib/gemini.ts` + `contratos/tipos.ts` | Gemini responde un JSON con esquema obligatorio (generado de Zod). Los ids de tarjeta son un `enum` armado en el momento con las tarjetas publicables: **no puede inventar una** |
| **Idempotencia** | `inbound_messages` (deduplica reintentos de los canales), `alert_deliveries` (único por alerta y persona), `lesson_sends` (no repetir en 24 h) | Telegram y WhatsApp reintentan; no queremos dos reportes ni dos alertas iguales |
| **Respuesta inmediata + trabajo diferido** | Webhooks con `after()` de Next | Se responde 200 al canal enseguida y se procesa después. Así Meta y Telegram no reintentan por demora |
| **Server Components + Server Actions** | `app/**/page.tsx`, `app/panel/acciones.ts` | Las páginas se arman en el servidor (rápidas en celulares modestos) y el panel ejecuta acciones sin una API aparte. Cada acción vuelve a validar sesión y rol |
| **Defensa en profundidad** | `proxy.ts` + revalidación en cada acción y ruta `/api` | El proxy no es la única barrera |
| **Degradación elegante** | Sin imagen → ícono; sin audio → solo texto; sin cupo de IA → menú fijo; sin WhatsApp → Telegram | El sistema nunca queda mudo |

---

## 4. Los cuatro flujos, de punta a punta

### 4.1 Aviso oficial → alerta aprobada (sin pronosticar nada)
1. **Detección:** un **cron diario** de Vercel llama a `/api/boletin/buscar` (protegido con `CRON_SECRET`). También existe el botón "Buscar boletín ahora" del panel.
2. Esa ruta lee la página de boletines del Senamhi, toma el **ALTIPLANO** más reciente y descarga el PDF.
3. **Lectura del PDF:** Gemini devuelve `AvisoGemini`: zona, período, fenómeno, nivel de riesgo y **citas literales**.
4. **Validación:** Zod valida la respuesta. El **código** (no la IA) decide con `decidirAlerta` si corresponde alertar: riesgo medio o alto. El nivel se toma de la cita del Senamhi.
5. **Borrador:** se arma la alerta con la tarjeta "qué hacer" de esa amenaza, el **enlace al PDF original** y el encabezado por nivel (🔴 roja, 🟠 naranja). Queda en `borrador` y se avisa a la técnica.
6. **Aprobación:** la técnica entra con su usuario y aprueba. Se genera **un** audio corto (TTS) y la alerta pasa a `aprobada`.
7. **Envío** a las personas suscritas de esas comunidades, por su canal. Cada entrega queda registrada (`alert_deliveries`).

### 4.2 La comunidad reporta por voz
1. Llega una nota de voz por WhatsApp o Telegram. El adaptador verifica la **firma** del canal y responde 200.
2. `procesarMensaje` deduplica, limita la frecuencia y llama a Gemini, que **transcribe y extrae**: tipo, días sin agua, familias, animales, problema y comunidad mencionada.
   - Gemini entiende el OGG/Opus de las notas de voz **sin convertirlo**.
3. El bot **confirma con la persona**: "Entendí: Kantuta Pampa · sin agua hace 6 días · 40 familias. ¿Es correcto?".
   - **Sí:** el reporte queda `confirmado`, se calcula la prioridad y se envía la tarjeta "durante".
   - **Confianza baja:** pide repetir. Si vuelve a fallar, lo revisa una persona.
   - **Otra comunidad mencionada:** pregunta para cuál es.
4. **«Mi reporte»:** escribiendo ESTADO, la persona ve su estado, su puesto en la prioridad y la entrega. Sin IA.

### 4.3 Prioridad pública y respuesta
1. **Fórmula pública y explicable** (`contratos/prioridad.ts`): días sin recurso 45 + familias 25 + animales 15 + espera 15 = 100.
   - Un dato faltante vale la mitad, para no castigar a quien no supo decirlo.
   - La espera se recalcula al leer: **cuanto más se espera, más sube**.
2. **Mapa y ranking públicos:** se actualizan solos.
3. **Panel, «Problemas activos»:** agrupa por problema ("4 comunidades con vertiente seca") y envía la tarjeta a todas con un clic, sin repetir en 24 h.

### 4.4 Entrega comprobable
1. **Registro:** la técnica registra la entrega con **foto sin personas y sin EXIF**. El reporte pasa a `atendido`.
2. **Confirmación:** la comunidad recibe "¿Llegó?" y responde. La respuesta, **incluido "No llegó"**, queda pública en `/entregas` y en la ficha de la comunidad.
3. **«Sin agua, a la vista»:**
   - un contador de días sin agua;
   - el tiempo de respuesta público;
   - la ficha compartible por WhatsApp;
   - un resumen imprimible para autoridades y prensa.

---

## 5. Modelo de datos (Postgres en Supabase)
| Tabla | Qué guarda |
|---|---|
| `stations`, `communities` | Estaciones del Senamhi y comunidades (con lat/lon, familias, animales; las de ejemplo marcadas) |
| `subscribers` | Persona suscrita: canal, id en el canal, comunidad, estado de registro. **Nunca se publica** |
| `inbound_messages` | Ids de mensajes recibidos, para no procesar dos veces y contar el uso de IA |
| `lessons` | Tarjetas: pasos (3–5) con **fuente y página por paso**, por qué importa, evita, pide ayuda, estado y verificador, rutas de imagen y audio |
| `bulletins` | Boletines procesados: PDF, lo que extrajo la IA y si es de ejemplo |
| `alerts`, `alert_deliveries` | Alertas con su estado, quién aprobó y a quién se entregó |
| `reports` | Reportes: datos extraídos, transcripción (privada), confianza, problema, prioridad y estado |
| `deliveries` | Entregas: tipo, cantidad, foto, quién registró y **si la comunidad confirmó** |
| `lesson_sends` | Envíos de tarjetas por problema desde el panel |

- **Seguridad de datos:** RLS activado en todas las tablas **sin políticas**. Solo el servidor, con la clave secreta, puede leer o escribir; la clave pública no ve nada.
- **Reglas en la base:** las reglas importantes (estados válidos, `verificada` exige verificador, 3–5 pasos con una fuente por paso) también están como **restricciones SQL**. Aunque el código tuviera un error, la base no acepta datos inválidos.
- **Storage:** `audios`, `tarjetas`, `entregas` y `boletines` son públicos; `reportes`, con los audios de la gente, es **privado**.

---

## 6. Tecnologías: qué, por qué y por qué no otra
| Tecnología | Por qué la elegimos | Alternativas y por qué no |
|---|---|---|
| **Next.js 16 (App Router, TypeScript)** | Un solo proyecto para web pública, API, webhooks, cron y panel. Server Components (rápido en celulares modestos), Server Actions (panel sin API aparte), `after()` para webhooks. TypeScript de punta a punta con los contratos | **Django/Laravel + SPA:** dos proyectos y dos lenguajes. **Express suelto:** habría que armar a mano lo que Next ya trae. **SvelteKit/Remix:** válidos, pero el equipo domina React |
| **Vercel** | Despliegue en cada push, HTTPS, cron incluido, sin servidores que mantener, costo cero para empezar | **VPS propio:** hay que administrarlo y asegurarlo. **Railway/Render:** similares, pero Vercel es nativo de Next. *Límite conocido:* en el plan gratis el cron corre una vez por día |
| **Supabase (Postgres + Storage)** | **Postgres de verdad:** relaciones (reporte → entrega → confirmación), restricciones y SQL. Storage en el mismo lugar. Región São Paulo (la más cercana a Bolivia). Gratis para empezar. **Postgres estándar: se puede migrar a cualquier servidor** | **Firebase:** NoSQL, sin restricciones relacionales, más difícil de auditar. **Postgres propio:** más trabajo de operación. **No usamos Supabase Auth:** las comunidades nunca inician sesión; solo unos pocos técnicos, y para eso basta una sesión propia simple y segura |
| **Gemini (`@google/genai`)**: `flash-lite` para leer y entender, `flash-tts` para voz | **Un solo proveedor** que lee el **PDF** directamente, **transcribe audio OGG/Opus sin convertir**, devuelve **JSON con esquema obligatorio** y genera **voz en español**. Barato y rápido (el boletín se lee en ~4 s) | **Whisper + GPT:** dos proveedores y conversión de audio. **ElevenLabs:** otro proveedor solo para voz. **Modelo local:** sin GPU en el servidor y peor calidad en español del Altiplano |
| **Zod v4** | Un solo esquema da los **tipos** de TypeScript, la **validación** en tiempo de ejecución y el **JSON Schema** que se le pasa a Gemini. El contrato no puede desalinearse | **Tipos a mano + validación aparte:** se desincronizan |
| **WhatsApp Cloud API + Telegram Bot API** | Las comunidades **ya usan WhatsApp**: nada que instalar, y **voz** para quien lee con dificultad. Telegram es gratis, inmediato y sin aprobación de Meta: canal del jurado y plan B | **App propia:** nadie la instalaría. **SMS:** sin voz y con costo por mensaje (queda para el futuro, sección 8) |
| **Leaflet + OpenStreetMap** | Libre, sin clave ni cobro, liviano y con datos abiertos | **Google Maps/Mapbox:** clave, cuotas y costo; dependencia innecesaria |
| **Tailwind v4 + tokens propios, `next/font` (Inter, Fraunces), lucide** | Sistema visual consistente con **contraste AA comprobado por prueba**. Fuentes servidas por nosotros (sin pedir nada a terceros) | **CSS a mano:** lento e inconsistente. **Librerías de componentes pesadas:** más peso para celulares con mala señal |
| **Vitest (+ Playwright para pruebas manuales)** | Pruebas rápidas de las reglas (prioridad, contratos, alertas, sesión, contraste). El login se probó de punta a punta con Playwright (la prueba no está en el repo) | **Jest:** más lento con TypeScript y ESM |
| **Scripts `tsx` + ffmpeg (fuera del servidor)** | Audios, imágenes y PNG se generan **antes** y se suben a Storage. El servidor no convierte nada | **ffmpeg en el servidor:** binario pesado en funciones serverless |

---

## 7. Seguridad, ética y transparencia
| Tema | Cómo se resuelve |
|---|---|
| **Secretos** | Solo en variables de entorno (`.env` local, Vercel). El repositorio público no tiene claves, tokens ni teléfonos. `server-only` impide que el código con la clave secreta llegue al navegador |
| **Webhooks** | WhatsApp con firma HMAC `X-Hub-Signature-256`; Telegram con `secret_token`. Las dos se comparan en tiempo constante |
| **Panel** | `/ingresar` con contraseñas **scrypt**, sesión en cookie **firmada (HMAC)**, `HttpOnly`, `Secure`, 8 h. Roles `tecnico` y `admin`. Bloqueo tras 5 intentos. **Cada acción revalida** sesión y rol |
| **Transparencia** | Mapa, prioridad con su desglose, tarjetas, fuentes, entregas, fichas y resumen son **públicos y sin login**. La fórmula de prioridad está escrita en la portada |
| **Privacidad** | Lo público no muestra teléfonos, nombres ni transcripciones. Los audios de reportes están en un bucket privado. Las fotos de entregas, sin personas ni EXIF |
| **IA responsable** | La IA no redacta consejos ni alertas: extrae datos y elige de una lista cerrada. Las cifras de la alerta son **citas literales** del Senamhi. Cada alerta la aprueba una persona. La voz sintética se declara por escrito |
| **Información verificable** | Cada paso de cada tarjeta cita documento y página. Solo se publican tarjetas `verificada` o `revisada` |
| **Abuso y costos** | Límite de mensajes por persona, tope diario de IA para los canales públicos, audios de máximo 60 s, deduplicación |
| **Datos de demostración** | Comunidades, reportes y entregas marcados **EJEMPLO**. El boletín sí es real (Senamhi, 14–23 nov 2026) |

---

## 8. Límites honestos y lo que viene
### 8.1 Límites de hoy (decirlos antes de que los pregunten)
- **WhatsApp:** el número de prueba de Meta solo llega a 5 números registrados.
- **Ventana de 24 h de WhatsApp:** fuera de ella, para avisar a alguien que no escribió hace poco, Meta exige **plantillas aprobadas**.
- **Plan gratis:**
  - el cron corre 1 vez al día;
  - la voz de Gemini permite pocas llamadas por día (hoy, 10).
- **Envío de alertas en secuencia** dentro de una función: alcanza para cientos de personas, no para decenas de miles.
- **Bloqueo de intentos del login en memoria:** no es global entre servidores.
- **Solo en español.**
- **Tarjetas:** 6 verificadas y publicadas. Hay 5 nuevas en verificación (nevada, después de la helada, cultivos, agua segura y animales en sequía) que no se publican hasta que una persona compruebe cada paso. La de nevada «durante» no se hizo: no encontramos una fuente oficial que pudiéramos leer, y no se rellena.

### 8.2 Tecnologías contempladas (futuro previsible)
| Cuándo | Qué | Por qué |
|---|---|---|
| Al adoptarlo un municipio | **Número propio de WhatsApp + plantillas aprobadas** | Alertas a toda la comunidad, sin la ventana de 24 h |
| Igual | **Plan pagado de Vercel y Gemini** (o servidor del municipio) | Cron cada hora, más TTS, funciones más largas |
| Con miles de suscritos | **Cola de envíos** (por ejemplo Vercel Queues o `pg_cron` en Supabase) | Envío masivo por lotes, con reintentos |
| Con más técnicos | **Supabase Auth o el inicio de sesión del municipio**, tabla de auditoría, bloqueo de intentos en la base | Usuarios y permisos administrables, rastro completo |
| Para quien no tiene smartphone | **SMS y llamadas de voz automáticas (IVR)** como nuevos adaptadores | El núcleo del bot no cambia: es un canal más |
| Con hablantes nativos que validen | **Quechua y aymara** en audios y textos | No antes de poder verificar la traducción |
| Más datos | **Avisos del Senamhi**, índices satelitales de sequía (lluvia, vegetación) **para contexto**, nunca para pronosticar nosotros | Detectar antes el desabastecimiento |
| Operación | **Región de Vercel en São Paulo** (junto a la base), monitoreo de errores, exportación de datos abiertos (CSV) para la Gobernación | Menos latencia, menos sorpresas, interoperabilidad |

---

## 9. Preguntas difíciles del jurado (respuestas de 20 s)
**"¿Por qué no hicieron una app?"**
> Porque nadie la instalaría. La comunidad ya usa WhatsApp, y una nota de voz sirve a quien lee con dificultad. La web es para la transparencia, no para la comunidad.

**"¿Qué pasa si la IA se equivoca?"**
> Hay cuatro frenos:
> 1. La IA no escribe consejos: solo elige entre tarjetas ya verificadas, de una lista cerrada.
> 2. En los reportes, la propia persona confirma lo que entendimos antes de que cuente.
> 3. En las alertas, el nivel sale de la cita literal del Senamhi y una persona aprueba.
> 4. Si la IA no está segura, pide repetir o lo revisa una persona.

**"¿No compiten con el Senamhi?"**
> No. No pronosticamos nada: retransmitimos sus avisos con su fuente y su enlace, y les agregamos "qué hacer" y el camino de vuelta desde la comunidad.

**"¿Cómo evitan que se manipule la prioridad?"**
> La fórmula es pública y está en la portada. Solo cuentan los reportes que la comunidad confirmó; la técnica puede corregir o descartar, y queda registrado quién lo hizo. La preparación de la comunidad nunca entra en la fórmula, para no castigar a quien está peor.

**"¿Escala?"**
> Para un municipio, sí, tal como está. Es un monolito modular serverless. Para un departamento entero, el primer paso es la cola de envíos y el plan pagado. La arquitectura ya separa ese módulo, no hay que reescribir.

**"¿Por qué Gemini y no otro modelo?"**
> Es un solo proveedor para las cuatro tareas: leer el PDF del Senamhi, entender audios de WhatsApp sin convertirlos, responder con un esquema obligatorio y generar voz en español. Con otro proveedor serían dos o tres servicios. Y como la IA está detrás de un contrato (Zod), cambiar de modelo es cambiar un archivo.

**"¿Y si se cae Vercel, Supabase o Gemini?"**
> - **Gemini:** el menú fijo y las tarjetas siguen funcionando sin IA.
> - **WhatsApp:** está Telegram.
> - **Supabase:** es Postgres estándar; se respalda y se migra a cualquier servidor.
> - **Vercel:** Next.js corre en cualquier servidor con Node.

**"¿Quién paga esto?"**
> Hoy cuesta cero, con los planes gratuitos. En producción el costo grande es WhatsApp por conversación y la IA por uso; los dos escalan con el uso real y los asume el municipio o la Gobernación.

**"¿Qué datos personales guardan?"**
> - **Guardamos:** el id del chat y la comunidad elegida.
> - **Privado:** la transcripción y el audio quedan en un almacenamiento privado.
> - **Público:** nada de personas, solo datos agregados por comunidad.
> - **Baja:** cualquiera se da de baja escribiendo BAJA.

**"¿Cómo saben que una tarjeta dice la verdad?"**
> Cada paso cita documento y página: FAO, Senamhi–INSA, CIPCA, etc. Una persona del equipo comprueba cada paso contra esa página antes de publicarla, y la base no acepta una tarjeta "verificada" sin verificador. Las fuentes están en `/fuentes` con su enlace.

---

## 10. Cifras del sistema (para citar)
| | |
|---|---|
| Código | ~6.000 líneas de TypeScript (app, lib, componentes, contratos, scripts) |
| Pruebas | 189 automáticas (Vitest), CI de GitHub en verde; el login también se probó en el navegador con Playwright y el bot de punta a punta en producción |
| Base de datos | 11 tablas, RLS en todas, reglas críticas también como restricciones SQL |
| Canales | 3 (WhatsApp, Telegram, web) sobre **un** bot |
| Usos de IA | 2 en tiempo real (leer boletín, entender mensajes) + voz para audios |
| Decisiones registradas | `decisiones.md`: cada cambio de contrato con su motivo |

> Cifras de la revisión final (dom 22/11, 10:10).
