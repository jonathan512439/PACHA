# PACHA

PACHA lleva los avisos oficiales del Senamhi a las comunidades del Altiplano de Oruro y les da una forma sencilla de contestar. Una familia recibe por WhatsApp o Telegram el aviso de helada, sequía o nevada, con pasos concretos para proteger su agua, sus animales y sus cultivos. Si le falta agua o forraje, responde con un audio. El municipio ve esos reportes ordenados en un mapa público, registra cada entrega de cisterna o forraje, y la comunidad confirma si de verdad llegó.

- **Sitio:** https://pacha-lilac.vercel.app
- **Bot de Telegram:** [@pacha_oruro_bot](https://t.me/pacha_oruro_bot)
- **Bot en el navegador, sin instalar nada:** https://pacha-lilac.vercel.app/probar

PACHA se hizo en el hackathon del 21 y 22 de noviembre de 2026. Los boletines del Senamhi que usa son reales. Las comunidades, los reportes y las entregas que se ven en el sitio son de demostración, y el sitio lo dice en cada página.

---

## Por qué existe

El Senamhi publica cada diez días un boletín agrometeorológico para el Altiplano. La información es buena, pero llega en un PDF de varias páginas, escrito por macrorregión, y casi nunca alcanza a la familia que tiene que decidir si guarda agua o encierra a sus llamas esa noche.

En sentido contrario pasa algo parecido. Cuando una comunidad se queda sin agua, el aviso al municipio suele ir por una llamada o por un dirigente. No queda registro de cuántos días lleva sin agua ni de cuántas familias son. Tampoco se sabe si la cisterna que se mandó llegó.

PACHA no reemplaza al Senamhi ni al municipio. Ordena lo que ya existe para que el aviso baje rápido, el reporte suba con datos, y el municipio pueda mostrar a quién atendió y por qué.

---

## Cómo funciona

El sistema sigue un ciclo de cuatro pasos.

### 1. El aviso oficial se convierte en una alerta (y una persona la aprueba)

- **Revisión automática.** Todos los días, a las 07:00 de Bolivia, Vercel revisa la página del Senamhi. Una tarea de GitHub Actions repite la revisión cada 30 minutos. Si aparece un boletín nuevo del Altiplano, se descarga el PDF y se guarda una copia.
- **Lectura del boletín.** Gemini lee el PDF y devuelve datos estructurados: la zona, el periodo, el nivel de riesgo y **las frases literales** del boletín que lo dicen, de hasta 200 caracteres cada una. Si falta la cita literal, no hay alerta.
- **La decisión la toma el código, no la IA.** Hay alerta cuando el boletín asigna riesgo medio o alto de helada, o cuando el Senamhi da un nivel naranja o rojo. El color de la alerta siempre es el que pone el Senamhi.
- **Revisión humana.** La alerta queda en borrador. En el panel, la técnica del municipio ve cada dato junto a la frase del boletín de la que sale, y el mensaje tal como se va a enviar. Recién cuando ella la **aprueba** se puede **enviar**.
- **Envío.** El mensaje usa las palabras del Senamhi y va acompañado de una tarjeta «qué hacer» y de un audio con voz sintética.
- **Comunicados de última hora.** Si el Senamhi emite un comunicado que no está en el boletín, la técnica lo carga a mano en el panel: copia el texto tal cual y pega el enlace oficial. Si marca la casilla «Es un simulacro», el mensaje y el audio lo dicen, y la web también.

### 2. La comunidad reporta por voz

- Una persona manda un audio de hasta 60 segundos, por ejemplo: «Hace seis días que la vertiente está seca, somos cuarenta familias».
- Gemini transcribe el audio y saca los datos: qué falta, desde cuándo, cuántas familias y cuántos animales.
- El bot nunca registra nada sin preguntar antes: «Entendí esto, ¿es correcto?». Solo con un «Sí» el reporte pasa a contar.
- Si la IA no entendió bien (confianza baja), pide repetir. Si vuelve a pasar, el reporte va a una bandeja del panel para que una persona escuche el audio y decida.
- Después de confirmar, el bot manda la tarjeta que corresponde al problema reportado.

### 3. La prioridad se calcula con una fórmula pública

Cada reporte confirmado recibe un puntaje de 0 a 100. Es la suma de cuatro criterios:

| Criterio | Puntos como máximo | Llega al máximo con |
|---|---|---|
| Días sin agua o forraje | 45 | 7 días o más |
| Familias afectadas | 25 | 100 familias o más |
| Animales afectados | 15 | 2000 animales o más |
| Tiempo de espera desde el reporte | 15 | 5 días o más |

- Si un dato falta, ese criterio cuenta la mitad. Así, no decir algo no baja la prioridad.
- Si el reporte no dice cuántas familias son, se usa el dato registrado de la comunidad.
- La prioridad de una comunidad es la de su reporte confirmado más urgente que todavía no fue atendido.
- **Niveles:** muy alta desde 70 puntos, alta de 50 a 69, media de 30 a 49 y baja por debajo de 30. Las comunidades sin reportes aparecen en gris.

El mapa y la ficha de cada comunidad muestran cuántos puntos aporta cada criterio. Los pesos están en [`contratos/prioridad.ts`](contratos/prioridad.ts) y son una propuesta del equipo: un municipio puede cambiarlos.

### 4. La entrega queda registrada y la comunidad la confirma

- Cuando el municipio atiende un reporte, registra la entrega en el panel: tipo (cisterna o forraje), cantidad y, si quiere, una foto.
- La foto se achica y se le borran los datos de ubicación en el navegador. El servidor vuelve a revisarla antes de guardarla.
- El bot le pregunta a la comunidad «¿Llegó?», con dos botones: Llegó y No llegó.
- La respuesta se publica en `/entregas`, junto a la prioridad que tenía el reporte. Cualquiera puede ver qué se entregó, dónde y si la comunidad lo confirmó.

---

## Las tarjetas «qué hacer»

Las recomendaciones que envía PACHA no las escribe la IA. Son tarjetas redactadas por el equipo a partir de documentos de FAO, Senamhi, la OPS y otras instituciones.

- Cada tarjeta tiene de 3 a 5 pasos cortos, en imperativo y de 18 palabras como máximo.
- **Cada paso cita su documento y la página exacta.** No hay dosis, medicamentos ni diagnósticos.
- Una tarjeta pasa por tres estados:
  - **borrador:** recién escrita;
  - **verificada:** una persona distinta de quien la escribió abrió la fuente en la página citada y comprobó cada paso;
  - **revisada:** además la revisó un técnico.
- El bot y el sitio solo muestran tarjetas verificadas o revisadas.
- Desde el panel se puede editar una tarjeta, crear una nueva o subir imágenes. Cada cambio queda como una versión en borrador. La versión publicada se sigue enviando hasta que otra persona verifique la nueva. Quien redacta un cambio no puede aprobarlo.
- Las ilustraciones se generaron con IA y no llevan texto, personas ni manos. El sitio lo indica.
- Hoy hay 11 tarjetas publicadas sobre helada, sequía y nevada. La lista de fuentes con sus enlaces está en `/fuentes`.

---

## Qué hace la IA y qué no hace

La IA solo hace tres cosas:

1. Lee el boletín y extrae datos con sus citas literales.
2. Transcribe los audios y entiende si la persona reporta un problema o hace una pregunta.
3. Ante una pregunta, elige una tarjeta de una lista cerrada. Si ninguna sirve, el bot responde con un mensaje fijo que deriva al técnico del municipio.

La IA no hace ninguna de estas:

- no escribe consejos ni alertas;
- no decide si hay alerta ni de qué color es;
- no envía nada sin que una persona lo apruebe;
- no inventa pronósticos.

Las respuestas de Gemini se validan con esquemas de Zod antes de usarse. Si Gemini falla o tarda más de 15 segundos, el bot avisa que el sistema está ocupado y ofrece el menú, que funciona sin IA. En una demo, `DEMO_FIXTURES=auto` usa en ese caso respuestas guardadas.

---

## Para probarlo

**Desde el navegador.** Entra a `/probar` y escribe cualquier cosa. El bot te pide aceptar los avisos y elegir una comunidad. Elige «Comunidad de prueba (EJEMPLO)» para que tus reportes no se mezclen con los demás.

**Desde Telegram.** Escribe a [@pacha_oruro_bot](https://t.me/pacha_oruro_bot) y sigue los mismos pasos.

Una vez registrado:

| Escribe | Qué pasa |
|---|---|
| `0`, `menu` o `alerta` | Muestra el menú de temas: agua, animales, cultivos y nevada |
| Una pregunta, por ejemplo «¿cómo protejo mis papas de la helada?» | Responde con la tarjeta que corresponde |
| Un audio o un texto contando un problema | Prepara un reporte y pregunta si lo entendió bien |
| `estado` | Muestra en qué quedaron tus reportes |
| `baja` | Deja de enviarte avisos |

El bot acepta hasta 10 mensajes cada 10 minutos por persona.

---

## El sitio

**Público, sin cuenta:**

| Página | Qué muestra |
|---|---|
| `/` | Aviso vigente, mapa de prioridad y comunidades sin agua o forraje |
| `/como-funciona` | El ciclo explicado y la fórmula de prioridad |
| `/comunidad/<id>` | Ficha de una comunidad: días sin agua, historial y entregas |
| `/tarjetas` | Todas las tarjetas «qué hacer», con fuente y audio |
| `/fuentes` | Boletines del Senamhi usados y documentos de las tarjetas |
| `/entregas` | Registro público de entregas y su confirmación |
| `/resumen` | Informe imprimible para autoridades y prensa |
| `/suscribirse` | Código QR para suscribirse por Telegram |
| `/probar` | El bot en el navegador |

El sitio no muestra nombres, teléfonos ni los audios de las personas. Los audios de los reportes solo se escuchan dentro del panel.

**Panel del municipio, con usuario y contraseña (`/ingresar`):**

| Rol | Qué puede hacer |
|---|---|
| técnico | Cargar comunicados, aprobar y enviar alertas, revisar reportes, registrar entregas |
| editor | Lo del técnico, más redactar versiones de tarjetas y registrar fuentes |
| verificador | Lo del técnico, más verificar y publicar versiones de tarjetas, o devolverlas con una observación |
| admin | Todo lo anterior, más buscar o subir boletines, retirar tarjetas y reiniciar los datos de demostración |

---

## Arquitectura

PACHA es un solo proyecto Next.js desplegado en Vercel: la web pública, el panel, la API y los webhooks de los bots viven en el mismo código. Está ordenado por dominios para que cada parte se pueda leer y probar por separado.

```
app/              páginas públicas, panel (/panel) y rutas de API (/api)
components/       componentes de interfaz (ui/, mapa/, portada/, tarjeta/, panel/)
contratos/        tipos, validaciones Zod, fórmula de prioridad y esquema SQL
lib/bot/          procesarMensaje: la lógica del bot, igual para todos los canales
lib/canales/      adaptadores de Telegram, WhatsApp y web
lib/boletin.ts    búsqueda y lectura del boletín del Senamhi
lib/alertas.ts    aprobación y envío de alertas
lib/tarjetas.ts   tarjetas «qué hacer» y su editor (editor-tarjetas*.ts)
data/             tarjetas y fuentes en JSON (lo que carga el seed)
scripts/          tareas que se corren a mano: seed, audios, imágenes, usuarios
tests/            pruebas con Vitest
docs/             guías de uso, decisiones y defensa técnica
```

El bot es una sola función, `procesarMensaje(canal, usuario, entrada)`, que devuelve una lista de respuestas: texto, audio, botones o tarjeta. Cada canal solo traduce esas respuestas a su formato. Por eso el bot del navegador, el de Telegram y el de WhatsApp se comportan igual.

| Pieza | Tecnología |
|---|---|
| Web, API, webhooks y panel | Next.js 16 (App Router, TypeScript) y Tailwind CSS 4 |
| Base de datos y archivos | Supabase (Postgres y Storage) |
| Lectura de boletines y audios, voz sintética | Gemini (`@google/genai`) |
| Validación | Zod 4 |
| Canales | Telegram Bot API; WhatsApp por la Cloud API de Meta (o whapi.cloud en la demo); chat web |
| Mapa | Leaflet con OpenStreetMap |
| Revisión periódica | Vercel Cron (diario) y GitHub Actions (cada 30 minutos) |
| Pruebas | Vitest, ejecutado por GitHub Actions con cada cambio |

La explicación completa (patrones, flujos de punta a punta, por qué cada tecnología y preguntas frecuentes) está en [`docs/guion-defensa-tecnica.md`](docs/guion-defensa-tecnica.md).

---

## Correr el proyecto en tu computadora

### Requisitos

- Node.js 22
- Un proyecto de Supabase (sirve el plan gratuito)
- Una clave de la API de Gemini
- Opcional: un bot de Telegram, creado con @BotFather, si quieres probar ese canal

### Pasos

1. Instala las dependencias y crea tu archivo de configuración:

   ```
   npm ci
   cp .env.example .env
   ```

   Completa el `.env` con tus valores. El archivo `.env` nunca se sube al repositorio.

2. Prepara la base de datos. En el SQL Editor de Supabase, ejecuta en este orden:
   - `contratos/schema.sql`;
   - `contratos/storage.sql`;
   - los archivos de `contratos/migraciones/`, del más antiguo al más nuevo (el nombre empieza con la fecha).

   La guía paso a paso está en [`docs/setup-supabase.md`](docs/setup-supabase.md).

3. Carga los datos iniciales:

   ```
   npm run seed:lecciones    # las tarjetas de data/tarjetas/tarjetas.json
   npm run seed:demo         # comunidades, reportes y entregas de demostración
   ```

4. Crea tu usuario del panel:

   ```
   npm run panel:usuario -- <usuario> <tecnico|editor|verificador|admin>
   ```

   El comando pide una contraseña de al menos 10 caracteres y devuelve una línea `usuario:rol:hash`. Pégala en `PANEL_USERS`. Si hay varios usuarios, van separados por comas.

5. Arranca el servidor:

   ```
   npm run dev
   ```

   El sitio queda en http://localhost:3000 y el panel en http://localhost:3000/ingresar.

### Comprobaciones antes de subir un cambio

```
npm run typecheck && npm run lint && npm test && npx next build
```

Son las mismas que corre GitHub Actions con cada cambio que se sube y con cada pull request.

### Otros comandos

| Comando | Para qué sirve |
|---|---|
| `npm run generar:audios` | Genera con Gemini el audio de las tarjetas |
| `npm run subir:audios` | Sube los audios a Supabase Storage |
| `npm run subir:imagenes -- --ids <id>` | Sube las ilustraciones de una tarjeta desde `assets/lessons/<id>/` |
| `npm run exportar:tarjetas` | Exporta cada tarjeta como imagen PNG |
| `npm run verificar:tarjeta -- <id> --por "<nombre>"` | Registra en `data/tarjetas/` quién verificó una tarjeta (después se corre `seed:lecciones`) |
| `npm run proponer:versiones` | Carga versiones de tarjetas propuestas para revisar en el panel |

Más detalle en [`docs/instructivo-salida-tarjetas.md`](docs/instructivo-salida-tarjetas.md).

---

## Variables de entorno

La lista completa, sin valores, está en [`.env.example`](.env.example).

**Obligatorias:**

| Variable | Para qué |
|---|---|
| `GEMINI_API_KEY` | Leer boletines, entender audios y generar voz |
| `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` | Base de datos y archivos. La clave de servicio solo se usa en el servidor |
| `SESSION_SECRET` | Firma la sesión del panel. Debe ser una cadena larga al azar |
| `PANEL_USERS` | Usuarios del panel, con el formato que genera `npm run panel:usuario` |
| `CRON_SECRET` | Protege la ruta que busca el boletín. Va el mismo valor en Vercel y en los secretos de GitHub Actions |

**Según el canal:**
- **Telegram:** `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET`.
- **WhatsApp con Meta:** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_APP_SECRET`.
- **WhatsApp con whapi.cloud:** `WHAPI_TOKEN` y `WHAPI_WEBHOOK_SECRET`.

**Opcionales:**

| Variable | Para qué |
|---|---|
| `TECNICA_CONTACTO` | Dónde avisar a la técnica cuando hay un boletín nuevo, por ejemplo `telegram:<chat_id>` |
| `DEMO_FIXTURES` | `auto`: si Gemini falla o tarda, usa respuestas guardadas. `on`: siempre las usa. `off`: nunca |
| `PROBAR_TOPE_DIARIO` | Límite diario de llamadas a Gemini desde `/probar` y Telegram |
| `DEMO_PERMITIR_BORRADOR` | Con `1`, muestra tarjetas en borrador, siempre con la etiqueta «sin verificar». Solo para pruebas |
| `APP_URL` | URL pública del sitio, si no es la de Vercel |
| `TELEGRAM_BOT_USERNAME` | Nombre del bot para el QR de `/suscribirse` |
| `GEMINI_MODEL`, `GEMINI_TTS_MODEL` | Modelos de Gemini para leer y para generar voz |
| `AUDIO_BIENVENIDA` | Con `1`, el bot manda un audio de bienvenida |

---

## Despliegue

El proyecto se despliega en Vercel desde la rama `main`.

- Configura en Vercel las variables obligatorias y las del canal que uses.
- El cron diario ya está definido en [`vercel.json`](vercel.json).
- Para la revisión cada 30 minutos, agrega en GitHub el secreto `CRON_SECRET` con el mismo valor que en Vercel. El flujo está en `.github/workflows/`.
- **Webhooks de los bots:**
  - Telegram: `/api/webhooks/telegram`
  - WhatsApp con Meta: `/api/webhooks/whatsapp`
  - whapi.cloud: `/api/webhooks/whapi`

---

## Límites conocidos

Preferimos decirlos antes de que alguien los encuentre:

- **WhatsApp.** Con el número de prueba de Meta, el bot solo llega a 5 números registrados. Fuera de la ventana de 24 horas desde el último mensaje de la persona, Meta exige plantillas aprobadas. Para la demo, WhatsApp funciona a través de whapi.cloud.
- **Alertas de color.** Las alertas de color del Senamhi están en una aplicación sin acceso público, así que no se leen solas: se cargan a mano como comunicado.
- **Voz sintética.** En el plan gratuito, Gemini permite pocas llamadas de voz por día. Los audios de las tarjetas se generan una vez y se guardan.
- **Volumen de envío.** Las alertas se envían una tras otra dentro de una función. Alcanza para cientos de personas, no para decenas de miles; para eso haría falta una cola de envíos.
- **Bloqueo de intentos de login.** Se guarda en memoria y no se comparte entre servidores.
- **Idioma.** Por ahora todo está en español. El quechua y el aymara esperan a tener hablantes que validen la traducción.
- **Tarjeta de nevada «durante».** No existe porque no encontramos una fuente oficial que pudiéramos leer, y no la vamos a rellenar.

---

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/guion-defensa-tecnica.md`](docs/guion-defensa-tecnica.md) | Arquitectura, patrones, tecnologías, límites y preguntas frecuentes |
| [`docs/instructivo-alertas.md`](docs/instructivo-alertas.md) | Cómo entran, se aprueban y se envían las alertas; simulacros |
| [`docs/flujos-de-uso.md`](docs/flujos-de-uso.md) | Recorridos de cada tipo de usuario |
| [`docs/mvp.md`](docs/mvp.md) | Alcance acordado del producto |
| [`contratos/CONTRATOS.md`](contratos/CONTRATOS.md) | Tablas, tipos y reglas de datos |
| [`decisiones.md`](decisiones.md) | Registro de decisiones y cambios |
| [`docs/setup-supabase.md`](docs/setup-supabase.md) | Preparar la base de datos |
| [`docs/instructivo-whatsapp.md`](docs/instructivo-whatsapp.md) y [`docs/instructivo-whapi.md`](docs/instructivo-whapi.md) | Configurar WhatsApp con Meta o con whapi.cloud |

---

## Fuentes y créditos

- **Avisos:** Senamhi, Boletín Agrometeorológico Decenal, Macrorregión Altiplano, y comunicados oficiales.
- **Recomendaciones:** FAO, Senamhi–INSA, OPS/OMS, CIPCA, CDC y otras instituciones. La lista completa, con enlaces y páginas, está en `/fuentes`.
- **Mapa:** © colaboradores de OpenStreetMap, con Leaflet.
- **Ilustraciones y voz:** generadas con IA (Higgsfield y Gemini).
