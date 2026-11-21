# Contratos v0.1 — Emergencia Altiplano

Archivos: `schema.sql` (tablas), `tipos.ts` (Zod: reporte, aviso, tarjeta, factores), `prioridad.ts` (fórmula), plantillas CSV.
Cambios a estos archivos solo con aviso en el grupo y una línea en `decisiones.md`.

## Valores cerrados (enumeraciones)
- Amenazas: `helada | sequia | nevada`
- Fases de tarjeta: `antes_familia | antes_animales | durante | despues`
- Tipo de reporte: `agua | dano | forraje | otro`
- Estado de reporte: `por_confirmar | revisar | confirmado | atendido`
- Estado de alerta: `borrador | aprobada | enviada | descartada` (nada se envía sin `aprobada`)
- Estado de tarjeta: `borrador | revisada` (`revisada` exige `reviewed_by`)
- Actividad de comunidad: `camelidos | papa_quinua | mixto`
- Urgencia (colores del mapa): `rojo >=70 · naranja >=50 · amarillo >=30 · verde <30`
- Factores: ver `FACTORES` en `tipos.ts`

## Reglas de contenido
- Cada paso de tarjeta: imperativo, máx. 18 palabras, con fuente y página. Sin dosis, medicinas ni diagnósticos.
- Si una frase no está en la página citada, no entra.
- Toda comunidad, boletín y entrega de demo lleva `is_example = true` y se muestra como "EJEMPLO".
- El mensaje de alerta lo arma código con plantilla. Gemini solo extrae datos y elige ids de tarjetas.
- La voz es sintética y se declara en el mensaje y en el pitch.

## Rutas
Públicas:
- `/` mapa con alertas activas (fuente y fecha) y comunidades
- `/alertas/[id]` detalle de una alerta con su tarjeta
- `/tarjetas` y `/tarjetas/[id]` biblioteca; `/tarjetas/[id]/imprimir` versión A4
- `/entregas` tablero de transparencia (qué se entregó, dónde, foto)
- `/suscribirse` formulario y instrucciones del WhatsApp
- `/preguntar` "Pregúntale al protocolo" en web

Panel (con login de Supabase Auth):
- `/panel` resumen · `/panel/reportes` · `/panel/prioridad` (fórmula y desglose)
- `/panel/alertas` (subir boletín, "Procesar boletín", vista previa, aprobar)
- `/panel/tarjetas` (revisión: borrador -> revisada)

API:
- `POST /api/webhooks/whatsapp` y `/api/webhooks/telegram`
- `POST /api/boletin/procesar` · `POST /api/alertas/[id]/aprobar`
- `POST /api/preguntar`
- `GET /api/og/tarjeta/[id]` (imagen) · `GET /api/reportes/[id]/pdf` (acta)

## Pendiente de decidir
- Pesos de `prioridad.ts` y umbral `UMBRAL_HELADA_DEMO_C` (valores de demo).
- Voz definitiva: Gemini TTS o ElevenLabs (después de la prueba de C).
- ID exacto del modelo de Gemini (variable `GEMINI_MODEL`).
