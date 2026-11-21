# Contratos v0.2 — Emergencia Altiplano (sáb 21 nov 2026)

Archivos: `schema.sql` (tablas), `storage.sql` (buckets), `tipos.ts` (Zod v4: mensaje entrante, aviso, tarjeta, bot, plantilla de alerta, menú) y `prioridad.ts` (fórmula y prioridad por comunidad). La versión anterior está en `v0.1/`.
Cambios a estos archivos solo con aviso en el grupo y una línea en `decisiones.md`.

## Valores cerrados (enumeraciones)
- **Amenazas:** `helada | sequia | nevada`
- **Fases de tarjeta:** `antes_familia | antes_animales | durante | despues`
- **Tipo de reporte:** `agua | dano | forraje | otro`
- **Estado de reporte:** `por_confirmar | confirmado | atendido | revisar | descartado`
  - `por_confirmar`: el bot espera el "Sí" de la persona.
  - `confirmado`: la persona dijo "Sí"; entra a la prioridad.
  - `atendido`: ya hubo entrega.
  - `revisar`: lo pone el código o el panel; fuera de la prioridad.
  - `descartado`: lo pone el panel; fuera de la prioridad.
- **Estado de alerta:** `borrador | aprobada | enviada | descartada`. Nada se envía sin `aprobada`.
- **Estado de tarjeta:** `borrador | verificada | revisada`
  - `verificada` exige `verified_by`: una persona del equipo comprobó cada paso en la página citada.
  - `revisada` exige `reviewed_by`: un técnico.
  - Solo `verificada` y `revisada` se envían. **No hay campo de autor**: se muestra la fuente (`source_doc`).
- **Riesgo de helada (boletín):** `bajo | medio | alto`. Un rango se toma por su valor superior.
- **Canales:** `whatsapp | telegram | web`
- **Actividad de comunidad:** `camelidos | papa_quinua | mixto`
- **Urgencia (colores del mapa):** `rojo >=70 · naranja >=50 · amarillo >=30 · verde <30 · gris = sin reportes activos`
- **Factores:** ver `FACTORES` en `tipos.ts`.

## Reglas de contenido
- **Pasos de tarjeta:** imperativo, máximo 18 palabras, con fuente y página (número del **visor de PDF**). Sin dosis, medicinas ni diagnósticos.
- **Literalidad:** si una frase no está en la página citada, no entra.
- **Etiquetas públicas:** "Verificada contra fuente" o "Revisada por …".
- **Ejemplos:** toda comunidad, entrega o boletín de demo lleva `is_example = true` y se muestra como "EJEMPLO". El boletín del 14–23 nov 2026 es **real** (`is_example = false`).
- **Mensaje de alerta:** lo arma el código con plantilla (`construirMensajeAlerta`), usando las **palabras del boletín** (zona, `cita_evento` y `cita_riesgo`, literales). Sin `cita_evento` no hay alerta.
- **Decisión de alertar:** la toma el código (`decidirAlerta`): alerta con nivel del Senamhi o con riesgo de helada `medio`/`alto`. Siempre pasa por aprobación humana.
- **Tarjeta de cada alerta:** regla fija `{amenaza}-antes_familia-01`. Si no está en estado enviable, la alerta no se puede aprobar.
- **Lo que hace Gemini:** solo extrae datos y elige ids de una **lista cerrada** (tarjetas `verificada` o `revisada`).
- **Menú:** fijo y sin IA (`MENU` en `tipos.ts`).
- **Voz:** es sintética y se declara en el mensaje y en el pitch.
- **Fotos de entregas:** sin personas, sin imágenes de internet y sin datos EXIF.

## Rutas
**Públicas:**
- `/`: mapa con la alerta activa (fuente y fecha) y las comunidades.
- `/alertas/[id]`: detalle de una alerta con su tarjeta *(se corta si falla el control del sáb 18:00)*.
- `/tarjetas` y `/tarjetas/[id]`: biblioteca. `/tarjetas/[id]/imprimir`: versión A4 *(se corta si falla el control del sáb 18:00)*.
- `/entregas`: tablero de transparencia.
- `/suscribirse`: QR de Telegram y QR `wa.me`.
- `/probar`: simulador web del bot.

**Panel (basic auth con `PANEL_USERS`):**
- `/panel`: resumen y **Reiniciar demo**.
- `/panel/alertas`: "Buscar boletín ahora", subida manual, vista previa, aprobar y enviar.
- `/panel/reportes`: corregir, confirmar o descartar los `revisar`, y **registrar entrega** con foto.
- `/panel/prioridad`: ranking, fórmula y desglose.

**API:**
- `POST /api/bot/web` (`BotWebRequest` → `BotWebResponse`; el usuario sale de una cookie).
- `POST /api/webhooks/whatsapp` (más el `GET` de verificación) y `POST /api/webhooks/telegram`.
- `GET|POST /api/boletin/buscar` (cron con `CRON_SECRET` o panel) y `POST /api/boletin/subir`.
- `POST /api/alertas/[id]/aprobar` y `POST /api/alertas/[id]/enviar`.
- `POST /api/entregas` (panel) y `POST /api/demo/reiniciar` (panel).

**Fuera del MVP:** `/panel/tarjetas`, la página `/preguntar`, `/api/og/*` y `/api/reportes/[id]/pdf`.

## Cambios v0.2 (respecto a v0.1)
1. Tarjetas: estado `verificada` y campo `verified_by`. Sin campo de autor. Audio en `audio_ogg_path` y `audio_mp3_path`. Ilustración en `image_path` con `image_is_ai`. El id se valida también en SQL.
2. `MensajeEntrante` (función `esquemaMensajeEntrante(ids)`) reemplaza a `ReporteGemini` y `RespuestaProtocolo`: una sola llamada con intención, datos del reporte e ids de tarjetas de una lista cerrada.
3. `AvisoGemini` v0.2: agrega `zona`, `riesgo_helada`, `cita_evento` y `cita_riesgo` (literales), que reemplazan a `cita_textual`. `decidirAlerta` devuelve también el motivo.
4. Plantilla de alerta con las palabras del boletín y fechas en texto ("14 al 23 de noviembre de 2026").
5. Bot: `EntradaBot`, `SalidaBot` (texto, audio, botones, lista y tarjeta, con los límites de WhatsApp), `BotWebRequest`/`BotWebResponse`, `MENSAJES` fijos y `LIMITES`.
6. `subscribers`: `community_id` puede ser null mientras la persona se registra. Nuevos campos `estado`, `contexto`, `activo`, `last_inbound_at` y `updated_at`, y canal `web`.
7. Nueva tabla `inbound_messages` (deduplicación y conteo del tope diario de IA).
8. `bulletins`: `source_url` único, `status` y `region`. El período se completa al procesar. `is_example` vale `false` por defecto.
9. `alerts`: `zona`, `risk_level`, `cita_evento` (obligatoria), `cita_riesgo`, `decision_reason` y audios OGG/MP3.
10. `alert_deliveries`: canal `web` y combinación `(alert_id, subscriber_id)` única.
11. `reports`: estado `descartado`, `confirmed_at`, `attended_at` y `updated_by`.
12. `deliveries`: `confirmed_by_community` puede ser null (sin respuesta). Nuevos campos `confirmed_at`, `is_example` y `registered_by`.
13. `communities.is_test` para la "Comunidad de prueba (EJEMPLO)". `stations.zona`, con Oruro-Ciudad y Oruro-Aeropuerto cargadas.
14. Storage: buckets públicos `audios`, `tarjetas`, `entregas` y `boletines`, y bucket **privado** `reportes`.
15. `prioridadComunidad`: el máximo de los reportes `confirmado`, con la espera recalculada al leer.

## Pendiente de decidir
- Pesos de `prioridad.ts` (son de demo).
- Voz definitiva (Gemini TTS recomendado).
- Valor de `PROBAR_TOPE_DIARIO`, según la cuota real.
