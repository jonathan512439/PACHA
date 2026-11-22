# Estado del Agente SERVIDOR

_Última actualización: dom 22/11, ~03:20_

## Hecho
### H2 · Tarjeta v0.4 y fuentes (en `main`)
**Para INTERFAZ, cómo usarlo:**
- **`Tarjeta` (`contratos/tipos.ts`)**, campos nuevos, todos **opcionales** (pueden ser `undefined` o `null`):
  - `por_que?: { texto, fuente: { doc, page } }`: "Por qué importa".
  - `evitar?: { texto, fuente }[]`: "Evita", de 0 a 2.
  - `pedir_ayuda?: { texto, fuente | null }`: "Pide ayuda si…".
  - Para el texto que se muestra usa **`textoPedirAyuda(t)`**: devuelve el de la tarjeta o el texto fijo `PEDIR_AYUDA_FIJO`.
  - `tieneSeccionesV04(t)` dice si trae alguna sección nueva.
- **`steps` y `step_sources` ahora son listas de 3 a 5** (antes, tuplas de 3). No supongas 3: recórrelas con `.map`.
- **`resolverImagenes(t, base, respaldo)`** devuelve un `pasos[i]` por paso si le pasas la tarjeta entera (con `steps`). `TarjetaVisual` sigue funcionando igual con las 6 actuales.
- **Fuentes (`lib/fuentes.ts`, puro, sirve en servidor y cliente):**
  - `listarFuentes()` → `Fuente[]` con `{ id, institucion, titulo, anio, url, tarjetas, consultado, nota }`.
  - `fuentesDeTarjeta(t)` → `{ fuente, paginas }[]`, sin repetir, para la sección "Fuentes" de `/tarjetas/[id]`.
  - `etiquetaFuente(f)` → "FAO (2010)".
  - **Si `url` es `null`, no lo enlaces**: muestra "Enlace por confirmar" y la `nota`. Hoy es el caso de CIPCA.
- **`/probar` (`components/probar/Chat.tsx`):** `SalidaBot` de tipo tarjeta cambió de forma:
  - `pasos` es una lista de 3 a 5 (el `.map` actual sirve);
  - nuevo `urlCompleta?`: enlace "Ver tarjeta completa" → `/tarjetas/<id>`. Conviene mostrarlo.
- Las 6 tarjetas actuales todavía no traen secciones v0.4: se completan en el bloque 4 (en borrador hasta que se verifiquen).

**Imágenes:** los pasos 2 y 3 de `sequia-antes_familia-01` ya están en Storage y el PNG está reexportado.

## En curso
- Bloque 2: login (`lib/sesion.ts`, `/ingresar`, roles). H3 (`nivelAlerta`) a las 04:30.

## Necesito de Jhonatan
**H7 listo para aplicar: v0.4**

- **H7 · Aplicar la migración** `contratos/migraciones/2026-11-22_tarjetas_v0.4.sql` en Supabase › SQL Editor. Primero quita cualquier regla CHECK vieja sobre `steps`, `step_sources` o `step_image_paths` (sin importar su nombre) y al final lista las columnas nuevas y los CHECK de `lessons`, para comprobar que solo quedan las de 3 a 5 pasos. Se puede ejecutar más de una vez. **No es urgente**: la app funciona igual sin ella. Hace falta antes de cargar tarjetas con "por qué", "evita" o "pide ayuda" (bloque 4).
- **CIPCA:** su sitio no respondió (error TLS) y no pude confirmar el enlace al boletín "Propuestas de respuesta integral a la sequía…". Si tienes el PDF o el enlace, pásamelo. Mientras tanto, la fuente aparece **sin enlace**.

## Necesito de INTERFAZ
- Nada por ahora. Uso `components/ui/*` (H1) para `/ingresar` cuando esté en `main`.
