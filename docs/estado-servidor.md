# Estado del Agente SERVIDOR

_Última actualización: dom 22/11, ~03:45_

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

### Bloque 2 · Login con sesión y roles (en `main`)
- `/ingresar` con usuario y contraseña; sesión de 8 h en cookie firmada; Salir y usuario en `app/panel/layout.tsx`.
- Roles: `tecnico` y `admin`. **Buscar/Subir boletín y Reiniciar demo son solo de admin**: si un técnico lo intenta, la acción devuelve `{ ok: false, mensaje: "Esta acción es solo para el rol admin…" }`.
- **Para INTERFAZ (opcional):** para ocultar esos botones a un técnico, en un Server Component **detrás de `<Suspense>`** usa `accesoActual()` de `lib/acceso-panel.ts` → `{ usuario, rol } | null`.
- Sin `SESSION_SECRET` todo sigue como antes (basic auth). En Vercel **no cambia nada** hasta que Jhonatan ponga las dos variables.

## En curso
- Bloque 3: H3 (`nivelAlerta`), mensaje de alerta v2 y guion de audio (H3 hasta las 04:30).

## Necesito de Jhonatan
**H7 listo para aplicar: v0.4**

- **H7 · Aplicar la migración** `contratos/migraciones/2026-11-22_tarjetas_v0.4.sql` en Supabase › SQL Editor. Primero quita cualquier regla CHECK vieja sobre `steps`, `step_sources` o `step_image_paths` (sin importar su nombre) y al final lista las columnas nuevas y los CHECK de `lessons`, para comprobar que solo quedan las de 3 a 5 pasos. Se puede ejecutar más de una vez. **No es urgente**: la app funciona igual sin ella. Hace falta antes de cargar tarjetas con "por qué", "evita" o "pide ayuda" (bloque 4).
- **Login, ahora en local (las 3 carpetas):** el `.env` local ya tiene `SESSION_SECRET`, así que el panel local pide `/ingresar` y **las entradas viejas `usuario:clave` ya no sirven allí**. Crea tus usuarios:
  ```
  npm run panel:usuario -- jhonatan admin
  npm run panel:usuario -- <técnica> tecnico
  ```
  y pon las líneas en `PANEL_USERS` (separadas por comas) del `.env`. Contraseña de al menos 10 caracteres.
- **Login en Vercel (cuando quieras):** pon **juntas** `SESSION_SECRET` (el mismo u otro de 64 hex) y las líneas nuevas de `PANEL_USERS`; Redeploy; entra por `/ingresar`. Si pones solo una de las dos, el panel queda cerrado o sigue con basic auth.
- **CIPCA:** su sitio no respondió (error TLS) y no pude confirmar el enlace al boletín "Propuestas de respuesta integral a la sequía…". Si tienes el PDF o el enlace, pásamelo. Mientras tanto, la fuente aparece **sin enlace**.

## Necesito de INTERFAZ
- Nada por ahora. `/ingresar` ya usa `components/ui` (Campo, Boton, Aviso). Gracias por H1.
