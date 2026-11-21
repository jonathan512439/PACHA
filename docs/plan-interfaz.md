# Plan de la interfaz web (A, sáb 21/11 16:40)

B no había subido pantallas, así que A construye el P0 de `docs/tareas-B.md` para no bloquear el demo. B puede tomar el diseño y los P1 encima de esto.

## Decisiones
- **Estilos:** utilidades de **Tailwind** (ya configurado en `globals.css`). **No usar `*.module.css`**: con la configuración actual de Turbopack llegan vacíos (lo descubrió el agente de tarjetas).
- **Datos:** componentes de servidor con `await connection()` dentro de `<Suspense>`, el patrón de Next 16 con Cache Components. Las consultas públicas están en `lib/datos-publicos.ts`, sin teléfonos ni transcripciones.
- **Panel:** `proxy.ts` con basic auth (`lib/panel-auth.ts`) para `/panel/*`. Las acciones del panel son **Server Actions**, que se publican en la misma URL `/panel/...` y por eso el navegador reenvía el login sin hacer nada extra. Cada acción vuelve a validar el usuario.
- **Mapa:** Leaflet sin `react-leaflet`, con círculos de color (sin íconos de imagen que se rompan) y la atribución de OSM visible. Se actualiza solo cada 15 s.
- **Seed:** comunidades con **UUID fijos**, para no romper a los suscriptores ya registrados. "Reiniciar demo" borra reportes, alertas, boletines y entregas, y vuelve a cargar los datos de ejemplo.

## Pantallas
| Ruta | Contenido | Prioridad |
|---|---|---|
| layout | Español, navegación y pie con EJEMPLO y voz sintética | P0 |
| `/` | Mapa por prioridad, franja de la alerta activa, ranking y "¿Cómo se calcula?" | P0 |
| `/probar` | Chat contra `/api/bot/web` con los 5 tipos de respuesta y grabación de voz | P0 |
| `/entregas` | Tablero público con la confirmación de la comunidad y la prioridad de origen | P0 |
| `/suscribirse` | QR de Telegram y de `/probar` | P0 (corto) |
| `/panel` | Resumen y **Reiniciar demo** | P0 |
| `/panel/alertas` | Buscar boletín, subir PDF, vista previa con citas, Aprobar, Enviar y Descartar | P0 |
| `/panel/reportes` | Lista por estado, audio firmado, confirmar o descartar, registrar entrega con foto | P0 |
| `/panel/prioridad` | Ranking con desglose | P1 (va dentro de `/panel`) |

## Datos de ejemplo (seed)
- **8 comunidades EJEMPLO** de Toledo (Oruro) y la "Comunidad de prueba". **Kantuta Pampa queda sin reportes**: es la que cambia de color en vivo durante el demo.
- **6 reportes de ejemplo:** 3 confirmados, que pintan el mapa, y 3 atendidos con su entrega. Una entrega llegó, otra no llegó y otra está sin respuesta, para mostrar la rendición de cuentas.
- **Fotos de entregas:** si existen `assets/entregas-ejemplo/1.jpg`, `2.jpg` y `3.jpg` (de C, sin EXIF), el seed las sube. Si no, las entregas quedan sin foto.
