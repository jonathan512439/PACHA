# Pasos restantes hasta la entrega (sáb 21/11 17:15 → dom 22/11 16:30)

## Estado actual (en producción: https://pacha-lilac.vercel.app)
| Pieza | Estado |
|---|---|
| Bot (web `/probar` y Telegram @pacha_oruro_bot) | ✅ Funciona. Flujo completo probado en producción: registro → reporte → confirmación → el mapa cambia |
| Mapa `/`, `/entregas`, `/suscribirse` y `/tarjetas` | ✅ En producción |
| Panel `/panel` (resumen y prioridad, alertas, reportes y entregas) | ✅ En producción, con el login de `PANEL_USERS` |
| Boletín → alerta → aprobar → enviar, y cron diario | ✅ Probado de punta a punta |
| Datos de ejemplo (9 comunidades, 6 reportes, 3 entregas) | ✅ Cargados (`npm run seed:demo` o el botón "Reiniciar demo") |
| Tarjetas | ⚠️ Las 6 están en **borrador**: falta verificarlas |
| WhatsApp | ⚠️ El código está listo; falta la app de Meta y el número |
| Fotos de entregas, README, afiche, presentación y video | ⏳ C |

---

## A · Jhonatan
1. **Probar el panel (10 min).** Abre `/panel` con tu usuario y clave de `PANEL_USERS`. Revisa el resumen, `/panel/reportes` y registra una entrega de prueba con foto.
   - ⚠️ **No pulses "Buscar boletín ahora" sin reiniciar después.** Consume el boletín del 14–23 nov y el demo necesita detectarlo en vivo. Si lo pruebas, al terminar pulsa **Reiniciar demo** en `/panel`, que borra los boletines.
2. **Probar Telegram con una nota de voz real (5 min).** Escribe `/start` a @pacha_oruro_bot, elige una comunidad y manda un **audio**: "Hace seis días que no hay agua, somos cuarenta familias". Confirma con **Sí** y mira el mapa. Así se confirma el audio real de Telegram (OGG), que solo probamos con audio sintético.
3. **Verificar las 3 tarjetas de sequía**, antes de las 18:00 (`docs/siguientes-pasos-tarjetas.md`, punto 1).
4. **Vercel:** borrar `SUPABASE_ANON_KEY`. Si quieres ver tarjetas en el bot antes de verificarlas, agrega `DEMO_PERMITIR_BORRADOR=1` y **quítala antes del ensayo**.
5. **Domingo:** dirigir los ensayos (punto "Domingo" abajo).

## B
**La interfaz P0 ya está hecha (A).** No la rehagas. Tu trabajo ahora:
1. **Verificar las 3 tarjetas de helada**, antes de las 18:00.
2. **Revisar en el celular** todas las páginas (`/`, `/probar`, `/entregas`, `/suscribirse` y el panel) y anotar lo que se vea mal: textos cortados, contraste, botones chicos.
3. **Pulir** encima de lo existente: estilos, accesibilidad, y `/alertas/[id]` si da el tiempo. Archivos: `app/`, `components/`; el plan está en `docs/plan-interfaz.md`.
   - Usa Tailwind; **no** uses `*.module.css`.
   - Trabaja en tu rama y corre `npm run typecheck && npm run lint && npm test && npx next build` antes de unir a `main`.

## C · Sergio
1. **WhatsApp:** ver la sección siguiente. Es lo más largo; conviene empezarlo ya.
2. **3 fotos de entregas de ejemplo:** objetos (bidón o tanque, fardo de forraje, cisterna o turril), **sin personas ni placas**.
   - Quita el EXIF: `exiftool -all= foto.jpg`, o abrir la foto y exportarla de nuevo.
   - Guárdalas como `assets/entregas-ejemplo/1.jpg`, `2.jpg` y `3.jpg` y corre `npm run seed:demo`. El seed las sube.
3. **README** del repo: qué es, cómo correrlo (`.env.example`), límites honestos (EJEMPLO, voz sintética, piloto), fuentes y créditos (Senamhi, FAO, CIPCA, OSM).
4. **Afiche A4** con el QR de `/suscribirse`.
5. **Presentación** con las cifras verificadas (`docs/analisis-critico.md`, hallazgo 14) y **video** de respaldo del guion (`docs/plan.md`, §5).

## Agente de tarjetas
Seguir `docs/siguientes-pasos-tarjetas.md`, punto 2: cuando A y B confirmen cada tarjeta → `verificada` → `npm run seed:lecciones` → audios → PNG → audio de la alerta.

---

## WhatsApp: dos caminos
### Camino 1 · Número de prueba de Meta (recomendado para el demo, ~40 min)
Seguir `docs/instructivo-whatsapp.md`. Solo puede escribir a **5 números registrados**: los del equipo. El jurado usa Telegram y `/probar`.

### Camino 2 · Número propio nuevo (si quieren que cualquiera pueda escribir)
**Requisitos:**
- Una **línea nueva** (SIM) que reciba SMS o llamadas.
- **No puede estar registrada en WhatsApp ni en WhatsApp Business.** Si lo está, primero se borra la cuenta de WhatsApp de ese número (en el celular: Ajustes › Cuenta › Eliminar cuenta).

**Pasos** (en la misma app de Meta del camino 1):
1. **WhatsApp › API Setup** › **Agregar número de teléfono** (*Add phone number*).
2. **Nombre visible:** por ejemplo `PACHA Avisos`. Meta revisa el nombre; tiene que coincidir con la marca y no puede ser genérico. *(El tiempo de revisión no está verificado: pueden ser horas.)*
3. **Categoría y descripción** del negocio.
4. **Verifica el número** con el código que llega por SMS o llamada.
5. Si el número queda como **"pendiente de registro"**, regístralo por API con un PIN de 6 dígitos que tú eliges (es el PIN de verificación en dos pasos):
   ```
   curl -X POST "https://graph.facebook.com/v23.0/<PHONE_NUMBER_ID_NUEVO>/register" \
     -H "Authorization: Bearer <WHATSAPP_TOKEN>" \
     -d "messaging_product=whatsapp" -d "pin=<6 dígitos>"
   ```
6. **Token permanente** (instructivo, paso 7). Al usuario del sistema asígnale la **cuenta de WhatsApp** que contiene el número nuevo.
7. **En Vercel:** reemplaza `WHATSAPP_PHONE_NUMBER_ID` por el **ID del número nuevo** y, si cambió, `WHATSAPP_TOKEN`. Haz **Redeploy**.
8. **El webhook no cambia:** es de la app, no del número, y sigue en `https://pacha-lilac.vercel.app/api/webhooks/whatsapp`.
9. **Prueba:** desde cualquier WhatsApp, escribe "hola" al número nuevo.

**A tener en cuenta (no verificado hoy, revisarlo en el panel de Meta):**
- Las **respuestas dentro de las 24 h** después de que la persona escribe son gratis y no necesitan plantilla. Así funciona el bot.
- Los mensajes **iniciados por el negocio** fuera de esas 24 h (las alertas a quien no escribió hace poco) necesitan **plantilla aprobada** y pueden exigir un **método de pago** en la cuenta. Para el demo se evita: los teléfonos escriben "ALERTA" 5 minutos antes.
- Una empresa sin verificar tiene un **límite diario** de conversaciones iniciadas por ella. Para el demo sobra.

**Plazo:** si el **domingo a las 11:45** WhatsApp (por cualquiera de los dos caminos) no responde, **el demo va por Telegram**, que ya funciona.

---

## Domingo
| Hora | Qué | Quién |
|---|---|---|
| 9:00–10:00 | Agente de tarjetas: cargar las verificadas, audios y PNG. C: README y afiche | Agente, C |
| 10:00–10:30 | Audio de la alerta del demo (`alertas/altiplano-2026-11-2.mp3` y `.ogg` en Storage) | Agente o C |
| 10:30–11:45 | WhatsApp (corte a las 11:45). B: últimos ajustes visuales | C, B |
| 11:45–12:30 | **Reiniciar demo** + ensayo completo en producción + **video final** | Todos |
| 12:30 | **Congelado.** Desde aquí no entra nada nuevo | — |
| 14:00 | **Ensayo 1** con Gemini real | Todos |
| 15:00 / 15:40 | Ensayos 2 y 3 con `DEMO_FIXTURES=on` en Vercel (volver a `auto` al final) | Todos |
| 15:50 | Revisión de secretos en el repo (`docs/plan.md`, §1) y quitar `DEMO_PERMITIR_BORRADOR` | A |
| 16:00–16:15 | **Entrega:** repo, URL de la demo y video | A |

**Antes de presentar** (lista completa en `docs/plan.md`, §5):
- **Reiniciar demo.** Así Kantuta Pampa queda gris y el boletín se detecta en vivo.
- Los 3 teléfonos escriben "ALERTA".
- Pestañas abiertas: `/panel/alertas`, `/`, `/panel/reportes` y `/entregas`.
- Hotspot y video de respaldo.
