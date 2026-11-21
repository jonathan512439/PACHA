# Tareas de B (frontend) — sáb 21/11, desde las 15:40

Referencias: `docs/mvp.md` (qué se construye), `docs/flujos-de-uso.md` (cómo se usa), `contratos/CONTRATOS.md` y `contratos/tipos.ts` (formas de los datos).

**Antes de escribir código lee `AGENTS.md`:** esta versión de Next (16.4) cambia APIs. Las guías están en `node_modules/next/dist/docs/`. Lo que más vas a usar:
- **Middleware se llama ahora `proxy.ts`:** `01-app/01-getting-started/16-proxy.md`.
- **Cache Components está activado:** `01-app/01-getting-started/08-caching.md`.
- **Rutas de API:** `01-app/01-getting-started/15-route-handlers.md`.

**Reglas que aplican a todas las pantallas:**
- Todo en español.
- Las comunidades, entregas y fotos de ejemplo llevan la etiqueta visible **EJEMPLO**.
- La voz se declara sintética.
- Nada lee Supabase desde el navegador: usa `db()` de `lib/supabase.ts` en componentes de servidor o en rutas de API.
- Diseño pensado primero para el celular.

**Ya está hecho (no lo rehagas):**
- `/tarjetas`, `/tarjetas/[id]` y `/tarjetas/[id]/imagen` (otro agente).
- El bot completo, `POST /api/bot/web` y los webhooks de Telegram y WhatsApp (A).

---

## P0 · Imprescindible para el demo (en este orden)

### 1. Layout y portada (30 min)
- En `app/layout.tsx`: `lang="es"`, título "PACHA" y una descripción de una línea.
- Barra de navegación: **Mapa · Tarjetas · Entregas · Probar el bot · Suscribirse**.
- Pie con el texto: "Comunidades y entregas de EJEMPLO · Avisos: Senamhi · Voz sintética".
- Borrar el contenido de `create-next-app` de `app/page.tsx`. Ahí va el mapa (tarea 4).

### 2. `/probar` — simulador del bot (2 h) ⭐ control de las 16:30
Es un chat que usa **`POST /api/bot/web`**, que ya funciona. La cookie la maneja el servidor: no mandes ningún id de usuario.
- **Para enviar:** `{ tipo: "texto", texto }`, `{ tipo: "boton", botonId }` o `{ tipo: "audio", audio: { base64, mime } }` (contrato `BotWebRequest`).
- **Respuesta:** `{ respuestas: SalidaBot[] }`. Hay que dibujar los 5 tipos:
  - `texto` → burbuja.
  - `botones` → hasta 3 botones. Al tocar uno se envía `{ tipo: "boton", botonId: id }`.
  - `lista` → lista de opciones (comunidades). Al tocar una, igual que un botón.
  - `tarjeta` → título, los 3 pasos numerados, "Fuente: {fuente}, pág. {pagina}", la `etiquetaEstado` visible, reproductor de `audioMp3Url` si existe, y la imagen (`imagenUrl`) si existe.
  - `audio` → reproductor con `mp3Url` (si no hay, usa `oggUrl`).
- **Botón "Empezar":** envía `{ tipo: "texto", texto: "hola" }`. El bot responde con la bienvenida.
- **Grabar voz:** usa `MediaRecorder` sin `mimeType`; en Chrome graba `audio/webm;codecs=opus`, y **Gemini lo acepta tal cual** (probado). Máximo 60 s, con un contador visible. Convierte el resultado a base64 y envía `{ tipo: "audio", audio: { base64, mime: recorder.mimeType } }`. El base64 no puede pasar de 3,5 MB.
- **Errores:** con un 500, muestra el texto que viene en `respuestas`. Si se corta la red: "Sin conexión, intenta de nuevo".
- **Listo cuando:** en producción se puede registrar → menú → tarjeta → reporte por voz → "¿Entendí bien?" → Sí.

### 3. Seed de demo y "Reiniciar demo" (1 h)
- **`scripts/seed-demo.ts`** (con `tsx`, como los del otro agente):
  - **8 comunidades EJEMPLO** del municipio de Toledo con coordenadas reales aproximadas de la zona, familias, animales, `main_activity` y `station_id = 'oruro-ciudad'`.
  - **La "Comunidad de prueba (EJEMPLO)"**, con `is_test = true`.
  - **3 entregas EJEMPLO** con las fotos que da C: objetos, sin personas, sin datos EXIF. Se suben al bucket `entregas` y se marcan con `is_example = true`.
  - **No** cargar el boletín de noviembre: en el demo se detecta en vivo.
  - Las tarjetas se cargan con `npm run seed:lecciones`, que ya existe.
- **`POST /api/demo/reiniciar`**, protegido por el panel:
  - borra `reports`, `alert_deliveries`, `alerts`, `bulletins` y las `deliveries` que no son de ejemplo;
  - vuelve a correr el seed de comunidades y entregas;
  - **no** borra `subscribers`, para que los teléfonos del equipo no tengan que registrarse de nuevo.
- El botón **Reiniciar demo** va en `/panel`.

### 4. Mapa `/` (1,5 h)
- **Mapa:** Leaflet con `dynamic(..., { ssr: false })` y teselas de OpenStreetMap, **con la atribución de OSM visible**.
- **Color de cada comunidad:** usa `prioridadComunidad()` de `contratos/prioridad.ts` con sus reportes en estado `confirmado`. Los colores son `rojo`, `naranja`, `amarillo` y `verde`, más **gris** si no tiene reportes activos.
- **Ventana de cada comunidad:** nombre, etiqueta EJEMPLO, puntaje, desglose (`resultado.desglose`, marcando los datos "estimados") y un enlace a "¿Cómo se calcula?", que muestra `PESOS` y la fórmula.
- **Franja de alerta activa:** la última alerta en estado `enviada`, con su fuente, fechas y `cita_evento`.
- **Actualización sola** cada 10–15 s, para que en el demo se vea el cambio de color después del reporte.
- **Datos:** desde un componente de servidor con `db()`. Por ejemplo, `lib/datos-publicos.ts`, sin teléfonos ni transcripciones.

### 5. Protección del panel (30 min)
- **`proxy.ts`** con *basic auth* para `/panel/*` y para las APIs que escriben (`/api/demo/*`, `/api/alertas/*`, `/api/boletin/*`, `/api/entregas`).
- **Usuarios:** salen de **`PANEL_USERS`**, con el formato `"patricia:clave1,marco:clave2"`. Hay que cargar esa variable en Vercel.
- El nombre del usuario se pasa en una cabecera a las rutas, para guardar `approved_by`, `updated_by` y `registered_by`.

### 6. `/panel/reportes` (1,5 h)
- **Lista por estado:** `confirmado`, `revisar`, `atendido` y `descartado`. Cada reporte muestra comunidad, tipo, transcripción, puntaje y fecha.
- **Audio:** el bucket `reportes` es **privado**, así que se escucha con una URL firmada (`db().storage.from("reportes").createSignedUrl(ruta, 600)`).
- **Acciones:**
  - **corregir** días, familias y animales;
  - **confirmar** o **descartar** los que están en `revisar`;
  - **Registrar entrega**: tipo (cisterna o forraje), cantidad, unidad y foto subida a `entregas`. Crea la fila en `deliveries` y pasa el reporte a `atendido`.
- **Depende de A:** después de registrar la entrega, llama a `notificarEntrega(id)`, que manda el "¿Llegó?" a la comunidad. Mientras A no la entregue, deja la llamada comentada.

### 7. `/panel/alertas` (1,5 h)
- **Botones:** **"Buscar boletín ahora"** y la subida manual del PDF (respaldo).
- **Vista previa:** zona, fenómeno, riesgo, mínima, **cada dato junto a su cita** (`cita_evento`, `cita_riesgo`), el motivo de la decisión (`decision_reason`), el mensaje armado y la tarjeta asignada.
- **Acciones:** **Aprobar** y **Enviar**, con un contador de enviados y fallidos.
- **Depende de A:** `POST /api/boletin/buscar`, `POST /api/boletin/subir`, `POST /api/alertas/[id]/aprobar` y `POST /api/alertas/[id]/enviar`. Arma la interfaz con datos falsos usando `fixtures/aviso-altiplano-2026-11-2.json` y conéctala cuando A avise.

### 8. `/entregas` — pública (45 min)
- **Cada entrega muestra:**
  - fecha, comunidad, tipo y cantidad, y la foto;
  - la confirmación de la comunidad: **Llegó** (`true`), **No llegó** (`false`) o **Sin respuesta** (`null`);
  - la **prioridad del reporte que la originó** (`report_id` → `priority_score`).
- Etiqueta EJEMPLO en las de ejemplo y "FOTO DE EJEMPLO" en las fotos.

---

## P1 · Si da el tiempo (domingo por la mañana)
9. **`/panel/prioridad`:** ranking de comunidades con su desglose, la fórmula y los pesos.
10. **`/panel`:** resumen (reportes por estado, última alerta) y el botón **Reiniciar demo**.
11. **`/suscribirse`:** QR de Telegram (`https://t.me/<usuario_del_bot>`), QR de `/probar` e instrucciones cortas. El QR de WhatsApp no va, porque el número de prueba solo acepta 5 destinatarios.

## P2 · Se corta si el control del sáb 18:00 no se cumple
12. **`/alertas/[id]`:** detalle público de una alerta con su tarjeta.
13. **`/suscribirse` completo:** si se corta, queda solo el QR.

---

## Lo que A entrega a continuación (te avisa cuando esté listo)
- API del boletín y de las alertas (buscar, subir, aprobar y enviar), con el cron diario.
- `notificarEntrega(deliveryId)`: el "¿Llegó?" por el canal de la persona.
- Si te ayuda, un `lib/datos-publicos.ts` con las consultas del mapa y de `/entregas`.

## Cómo probar
- **En local:** `npm run dev`. Next 16 permite **un solo** `next dev` por carpeta.
- **Antes de subir:** `npm run typecheck`, `npm run lint`, `npm test` y `npx next build`, sin errores.
- **Trabaja en una rama tuya** (`feat/b-...`) y avisa antes de unir a `main`, porque `main` se despliega solo a producción.
