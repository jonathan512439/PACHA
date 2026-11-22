# Estado del Agente INTERFAZ

**Hecho:**
- **H1 · Base visual y contraste** (en `main`).
  - Un solo tema claro. Se quitó el modo oscuro de `app/globals.css`; `color-scheme: only light` (también en `viewport`), así Chrome en Android no oscurece la página.
  - Fuentes con `next/font`: **Inter** (texto, `font-sans`) y **Fraunces** (títulos `h1–h3`, `font-titulo`). Se quitó Geist.
  - Tokens de color en `globals.css` (`@theme`) y su espejo en `components/ui/tokens.ts`.
  - `tests/contraste.test.ts`: 68 casos. Comprueba que los dos archivos coinciden, que no vuelve el modo oscuro, texto ≥ 4,5:1 y gráficos ≥ 3:1.
  - `text-stone-400` y `text-stone-500` quedaron oscurecidos a nivel global: las páginas viejas (incluido el panel) ya cumplen AA mientras se migran.
  - Cabecera y pie nuevos en `app/layout.tsx` (`components/ui/Cabecera.tsx`, `Pie.tsx`).
  - Los marcadores del mapa usan los colores de los tokens.

- **Bloque 2 · Portada `/`** (en `main`).
  - Banda del aviso arriba: ALERTA ROJA (riesgo alto) o NARANJA (medio) según `risk_level`, con la cita, "Qué hacer hoy" y el enlace al PDF original (`bulletins.source_url`). Si el aviso venció, sale como informativo. Prueba: `tests/portada.test.tsx`.
  - Frase central, ilustración de portada y los 4 pasos del ciclo con cifras vivas (aviso vigente, tarjetas verificadas, reportes confirmados sin atender, entregas confirmadas por la comunidad), con hora y la etiqueta EJEMPLO.
  - Mapa + ranking lado a lado (debajo en el celular), leyenda y "¿Cómo se calcula?" con tabla.
  - Ilustraciones del lote 2 revisadas (sin texto, personas ni manos) en `public/ilustraciones/`, con el pie "generada con IA".
  - `lib/datos-publicos.ts`: `alertaActiva()` trae además `fuente_url`; nueva `resumenCiclo()`.

- **Bloque 3 · Mapa** (en `main`): `components/mapa/MapaInteractivo.tsx`.
  - Lista sincronizada (tocar una comunidad vuela el mapa y abre su ficha; tocar un marcador marca la fila). Es la alternativa accesible al mapa.
  - Filtros: nivel, problema (Agua · Forraje · Daños) y "Solo sin entrega todavía".
  - Ficha: familias, días sin agua o forraje, problema, última entrega y si llegó, desglose de la prioridad y enlace a `/comunidad/[id]`.
  - Banda del aviso vigente sobre el mapa, pantalla completa (Esc para salir), leyenda fija, "Actualizado hace X s" y pulso en los marcadores rojos (se apaga con reduce-motion).
  - **Cambio respecto al plan:** CARTO Positron ahora exige clave (devuelve "API KEY REQUIRED"). Uso los mosaicos de OpenStreetMap con un filtro gris suave, con su atribución.
  - Cálculos de «Sin agua, a la vista» en `lib/visibilidad-calculo.ts` (puro, `tests/visibilidad.test.ts`) y consultas en `lib/visibilidad.ts`. El contador sigue subiendo hasta que la comunidad confirma que llegó la ayuda.

- **Bloque 5 (parte 1) · Ficha pública `/comunidad/[id]`** (en `main`): contador de días sin agua o forraje, línea de tiempo (reportó → confirmó → entrega → la comunidad respondió), prioridad con su puesto y desglose, tiempo de respuesta y "Compartir por WhatsApp" (`wa.me`) con un texto que solo dice hechos confirmados y lleva [EJEMPLO] si corresponde. Sin nombres ni teléfonos.

- **Bloque 4 · Tarjetas v0.4** (en `main`).
  - `/tarjetas`: cuadrícula por amenaza (Helada · Sequía · Nevada, solo las que existen) y fase (Antes · Durante · Después). Las que no se pueden publicar salen grises con "en verificación" y sin enlace.
  - `/tarjetas/[id]`: la tarjeta de siempre (`TarjetaVisual`, la misma del PNG) y al lado `components/tarjeta/SeccionesV04.tsx`: Por qué importa, Evita, Pide ayuda si… (`textoPedirAyuda`), audio con voz sintética si está vigente, Fuentes con enlace al original (`fuentesDeTarjeta`; sin `url`, "Enlace por confirmar" + nota) y estado. Al imprimir sale solo la tarjeta.
  - La tarjeta web se achica según su propio ancho (container query). En el PNG, con 4 o 5 pasos, el texto baja a 27 o 24 px (`data-pasos`) para que no se corte.
  - `/fuentes`: lista de `lib/fuentes.ts` con institución, año, enlace al original, fecha de consulta y tarjetas que la usan.
  - Se borró `app/tarjetas/tarjetas.css` (ya no se usa). Página 404 en español (`app/not-found.tsx`).

- **H3 integrado:** la banda de la portada y la del mapa usan `nivelAlerta()` del contrato (`risk_level` y `senamhi_level`).
- **Bloque 5 (parte 2)** (en `main`):
  - Portada: sección «Sin agua, a la vista», con una tarjeta por comunidad y recurso ordenada por días, el estado de la entrega y el enlace a su ficha.
  - `/resumen`: resumen imprimible para autoridades y prensa. Muestra comunidades sin agua o forraje, días acumulados, familias, pendientes, entregas de 7 días (llegó / no llegó / sin respuesta), tiempo de respuesta promedio y una tabla por comunidad, con EJEMPLO y fuentes. Botón "Imprimir o guardar en PDF".

- **Bloque 6** (en `main`):
  - `/entregas`: tarjetas con foto (o una franja "Sin foto"), cantidad, comunidad con enlace a su ficha, fecha, prioridad del reporte y la respuesta de la comunidad bien visible (Llegó · No llegó · Sin respuesta), con totales arriba.
  - `/probar`: chat con burbujas de alto contraste, botones de 44 px, íconos de micrófono y enviar, y la tarjeta como en la web, con **"Ver tarjeta completa"** (`urlCompleta`, abierta en la misma web).
  - `/suscribirse`: 3 pasos, QR grandes en tinta, "Qué recibes".
  - ⚠️ Al revisar `/probar` toqué "Empezar" una vez: el bot creó **un suscriptor web anónimo en estado "nuevo"** (sin datos personales). No lo borré, porque no escribo en Supabase. Se va con "Reiniciar demo".

- **Bloque 7 · Panel** (en `main`): `/panel`, `/panel/reportes`, `/panel/alertas` y `components/panel/Acciones.tsx` pasan a los tokens (marca, superficie, borde, roja, verde, ocre), con botones de 40 px y títulos en Fraunces. Solo clases: no cambió la estructura ni las acciones.
  - **No lo pude ver en pantalla:** el panel pide login y no tengo contraseña. **Pido a Jhonatan o B** que abran `/panel`, `/panel/reportes` y `/panel/alertas` en el celular y en la PC y me avisen si algo se ve mal.

- **Repaso final en producción** (`pacha-lilac.vercel.app`, 390 y 1280 px, con el sistema en modo oscuro). Revisé `/`, `/tarjetas`, una tarjeta, `/fuentes`, `/comunidad/<id>`, `/entregas`, `/resumen`, `/probar`, `/suscribirse` e `/ingresar`.
  - Sin desbordes, sin texto cortado y sin errores de consola. El modo oscuro del sistema no cambia nada: fondo hueso y `color-scheme: light only`.
  - Corregido: los enlaces sueltos ("← Volver", "Ver el aviso", "Abrir el documento original", las URL de los QR, el logo) y los chips de filtro del mapa ahora miden al menos 40 px de alto.
- **404 de `/comunidad/<id inexistente>`: queda en HTTP 200** con la página "No encontramos esta página" y `noindex`.
  - Motivo: con Cache Components y `partialPrefetching: true` (`next.config.ts`), la respuesta empieza con el shell en 200 antes de que la página pueda llamar a `notFound()`. Probé validar el id fuera del `<Suspense>` con `generateStaticParams` y una lista en caché, con `next build && next start`: siguió en 200, así que lo revertí.
  - Según la guía de Next 16 (`loading.md` › Status codes), el único camino es `proxy.ts`, que es de SERVIDOR. **Opcional para SERVIDOR:** en `proxy.ts`, si `/comunidad/:id` no tiene formato UUID, responder 404 (es rápido y no consulta la base).

**Necesito de SERVIDOR o de Jhonatan:**
- Jhonatan o B: ver el **panel** con sesión (`/panel`, `/panel/reportes`, `/panel/alertas`), porque yo no puedo entrar.

TERMINADO: 22/11 10:05

**Después del cierre, a pedido de Jhonatan (22/11):** imágenes de las tarjetas desde el panel.
- En `Tarjetas › Editar` y en `Nueva tarjeta` hay una sección **Imágenes** (encabezado 16:9) y una imagen cuadrada dentro de cada paso, con los botones Subir imagen, Cambiar, Quitar y Deshacer (`components/panel/CampoImagenTarjeta.tsx`).
- El navegador la achica (1600 px el encabezado, 900 px los pasos) y la vuelve a codificar en WebP, sin metadatos. El servidor la valida otra vez con `validarFoto` (formato real, ≤ 5 MB, sin EXIF).
- Al guardar el borrador se sube a `tarjetas/lessons/<id>/<sello>-header.webp` (o `-pasoN.webp`), con un nombre nuevo cada vez: nunca pisa la imagen publicada. Se publica cuando otra persona verifica la versión. La página de verificación muestra antes → después y la casilla «sin texto, personas ni manos».
- Al publicar, las imágenes de la versión mandan: así se puede **quitar** una (el encabezado vuelve al de respaldo y el paso, al ícono). Si solo cambian las imágenes, también se puede guardar la versión.
- `scripts/subir-imagenes.ts --ids` acepta también tarjetas creadas en el panel (lee cuántos pasos tienen en `lessons`).
- Las imágenes viejas no se borran del bucket: quedan como historial.

**Logo y última revisión (22/11, a pedido de Jhonatan):**
- Logo de PACHA guardado en `public/marca/pacha-logo.png` (original, 1254 px) y `public/marca/pacha-logo-512.webp` (versión web).
- Íconos: `app/favicon.ico` (16, 32 y 48 px, en RGBA, porque Turbopack no lee un ICO con PNG RGB), `app/icon.png` (192 px) y `app/apple-icon.png` (180 px). Next agrega las etiquetas solo. Se borraron los SVG de la plantilla de Next en `public/`, que nada usaba.
- Revisión de todas las páginas públicas a 390 y 1280 px, sin errores de consola. Corregido:
  - `/fuentes` se desbordaba en el celular: los `sr-only` de la tabla de boletines escapaban del contenedor con scroll. Ahora los contenedores `overflow-x-auto` llevan `relative`.
  - Un aviso de un solo día decía «22 al 22 de noviembre». Ahora dice «22 de noviembre de 2026» (helper `periodo` en `components/ui/formato.ts`), en la banda, el mapa, «Cómo funciona» y Panel › Alertas.
  - La cita del boletín cortada a 200 caracteres terminaba a mitad de palabra. Ahora termina en la última palabra completa con «…».
  - «Qué hacer», «Boletín del Senamhi», «Cómo se calcula» e «Imprimir» miden 40 px. La etiqueta de la alerta sobre el mapa pasa a dos líneas en vez de cortarse.
- **Simulacro marcado en la web pública (revisión previa al pitch).** Una alerta que viene de un boletín o comunicado marcado como simulacro (`bulletins.is_example`) antes se mostraba en la portada como «ALERTA ROJA · NEVADA FUERTE», sin aviso. Ahora:
  - la banda dice «… · SIMULACRO» y «Simulacro · EJEMPLO: no es una emergencia real»;
  - el mapa dice «SIMULACRO · ALERTA ROJA…» y «Cómo funciona», «Simulacro · Nevada…».
  - Un comunicado cargado a mano ya no se presenta como «boletín agrometeorológico decenal»: dice «comunicado» y el enlace, «Comunicado original».

---

## Componentes de `components/ui` (para SERVIDOR: solo usarlos)

Todos funcionan en Server Components. Se importan de `@/components/ui`.

### Colores (clases de Tailwind)
| Uso | Clase |
|---|---|
| Fondo de página / caja / zona secundaria | `bg-fondo` · `bg-superficie` · `bg-superficie-2` |
| Texto principal / secundario | `text-tinta` · `text-tinta-2` (nunca grises más claros) |
| Marca (enlaces, botón primario) | `text-marca` · `bg-marca` · `bg-marca-suave` |
| Bordes decorativos / que informan (campos) | `border-borde` · `border-borde-fuerte` |
| Niveles, llenos (texto blanco encima) | `bg-roja` · `bg-naranja` · `bg-ocre` · `bg-verde` |
| Niveles, suaves (texto `*-tinta` encima) | `bg-roja-suave text-roja-tinta`, igual con `naranja`, `ocre`, `verde`, `gris` |
| Cifras alineadas | `cifras` |

Fuera de Tailwind (SVG, Leaflet, estilos en línea): `COLORES` y `COLOR_NIVEL` de `components/ui/tokens.ts`. Si cambias un color, cámbialo en los dos archivos: la prueba lo exige.

### Componentes
```tsx
import { Aviso, Boton, Campo, Cifra, Fuente, Insignia, Tarjeta, Vacio, clasesBoton } from "@/components/ui";

<Boton type="submit">Ingresar</Boton>                       // primario, 44 px de alto
<Boton variante="secundario" href="/panel">Volver</Boton>  // con href se dibuja como <Link>
<Boton variante="peligro" tamano="sm">Descartar</Boton>     // variantes: primario · secundario · peligro · fantasma; tamaños: sm · md · lg
<button formAction={accion} className={clasesBoton("secundario")}>…</button>  // las clases sueltas

<Campo etiqueta="Usuario" name="usuario" autoComplete="username" required />
<Campo etiqueta="Contraseña" name="clave" type="password" error={estado?.error} />  // error: borde rojo + mensaje anunciado
<Campo como="select" etiqueta="Rol" name="rol"><option>tecnico</option></Campo>
<Campo como="textarea" etiqueta="Nota" name="nota" ayuda="Opcional." />

<Aviso nivel="error" titulo="Usuario o contraseña incorrectos." />
<Aviso nivel="atencion" titulo="Demasiados intentos">Espera 10 minutos.</Aviso>
<Aviso nivel="roja" titulo="HELADA FUERTE" accion={<Link href="/tarjetas/x">Ver qué hacer</Link>}>Altiplano de Oruro · 14 al 23 de noviembre</Aviso>
// niveles: roja · naranja (banda llena, dice "ALERTA ROJA/NARANJA" sola) · info · exito · error · atencion

<Tarjeta titulo="Problemas activos" accion={<Link href="…">Ver todo</Link>}>…</Tarjeta>  // caja blanca; relleno={false} para tablas
// Si en el archivo ya usas el tipo `Tarjeta` de contratos: import { Caja } from "@/components/ui"

<Insignia tipo="ejemplo" />          // EJEMPLO
<Insignia tipo="verificada" />       // también: revisada · borrador · llego · no-llego · sin-respuesta · alerta-roja · alerta-naranja · nivel-rojo|naranja|amarillo|verde|gris
<Cifra valor={6} etiqueta="días sin agua" detalle="confirmado por la comunidad" tono="roja" />
<Fuente institucion="Senamhi" documento="Boletín decenal" pagina={6} url={src} fecha="14 al 23 de noviembre" />
<Vacio titulo="Todavía no hay entregas." />
```

Reglas: el nivel siempre con color + palabra + ícono; todo campo con etiqueta visible; nada de texto en `stone-300/400` sobre blanco.
