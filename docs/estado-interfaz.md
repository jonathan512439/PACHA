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

**En curso:** bloque 3, el mapa (CARTO Positron, lista sincronizada, filtros, ficha, pantalla completa).

**Necesito de SERVIDOR o de Jhonatan:**
- H2 (tipo `Tarjeta` v0.4 y `lib/fuentes.ts`) para `/tarjetas/[id]` y `/fuentes`.
- H3 (`nivelAlerta`) para la banda de la portada. Mientras tanto uso `risk_level`.

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
