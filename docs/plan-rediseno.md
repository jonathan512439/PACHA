# Plan de rediseño y mejoras · noche del dom 22/11

**Para:** el equipo (A Jhonatan, B, C Sergio) y Claude · **Desde:** 01:45 · **Entrega:** dom 16:30
**Regla de tiempo:** a las **10:30 se congela el código**. Después solo se corrigen errores y se ensaya. Lo que no esté listo a esa hora queda fuera, sin discusión.

| # | Bloque | Estado | Quién | Hasta |
|---|---|---|---|---|
| 1 | «Mi reporte» en el bot | ✅ Hecho (`17015e8`) | Claude | — |
| 2 | Panel: agrupar por problema y reenviar la tarjeta | ⏳ | Claude | 03:00 |
| 3 | Rediseño completo (sistema visual + contraste) | ⏳ | Claude (código), B (revisión en el celular) | 06:30 |
| 4 | Alerta corta y alarmante por nivel (texto y audio) | ⏳ | Claude | 04:00 (audio después de las 04:30) |
| 5 | Login serio solo para lo vital | ⏳ | Claude | 05:00 |
| 6 | Tarjetas nuevas y más completas | ⏳ | Claude (borrador), A y B (verificar), A (imágenes) | borrador 05:00 · verificadas 09:00 |
| 7 | Mapa más completo | ⏳ | Claude | 07:30 |
| 8 | «Sin agua, a la vista» (visibilidad del desabastecimiento) | ⏳ | Claude | 09:00 |
| 9 | Audios e imágenes de lo nuevo | ⏳ | Claude (audios), A (Higgsfield) | 10:00 |
| 10 | Ensayo con todo nuevo + Reiniciar demo | ⏳ | Todos | 11:00 |

**Orden de ejecución:** 2 → 3 (base visual) → 5 → 4 → 6 → 7 → 8 → 9. El rediseño va antes que el mapa y lo nuevo, porque todo lo demás se construye sobre sus componentes.

---

## 1. «Mi reporte» ✅
- **Cómo se pide:** escribir **ESTADO** (o "mi reporte"), o tocar el botón **📋 Ver mi reporte** que llega al confirmar.
- **Qué muestra:** los últimos 3 reportes con:
  - su estado;
  - la prioridad con color y puesto ("🟠 urgente · puesto 2 de 5");
  - la entrega registrada.
- **Si hay una entrega sin responder:** ofrece los botones **Llegó** / **No llegó** ahí mismo.
- **Costo:** no usa IA ni gasta el límite de mensajes.

## 2. Panel: agrupar por problema
**Objetivo:** que la técnica vea patrones, no solo una lista de reportes.

- **En `/panel` (resumen):**
  - tabla **"Problemas activos"** por `factor`. Ejemplo: *Vertiente seca · 4 comunidades · 160 familias · el más antiguo hace 5 días*;
  - por cada fila, un botón **"Enviar qué hacer a estas comunidades"**. Manda la tarjeta "durante" de ese factor (la misma regla del bot) a los suscriptores de esas comunidades, por su canal.
- **Reglas del envío:**
  - solo sale una tarjeta `verificada` o `revisada`;
  - una vez por factor y comunidad cada 24 h (no se spamea);
  - se registra quién lo envió.
- **Datos:** reportes `confirmado` agrupados por `factor`. Los envíos se guardan en una tabla nueva `lesson_sends` (factor, lesson_id, community_id, enviado_por, fecha).
  - **Cambio de contrato:** va con aviso y una línea en `decisiones.md`.

## 3. Rediseño completo
### 3.1 Causa del contraste malo (se corrige primero)
`app/globals.css` cambia el texto a claro cuando el teléfono o la PC está en **modo oscuro**, pero las tarjetas tienen fondo claro: queda texto claro sobre fondo claro. Además se usan grises tenues (`text-stone-500`) para texto importante.

**Arreglo:**
- un solo tema claro, definido con *tokens* (variables de color);
- `color-scheme: light`;
- **todo texto con contraste ≥ 4,5:1** (WCAG AA), y ≥ 3:1 en íconos y bordes que transmiten algo;
- se comprueba con una prueba automática de contraste sobre los tokens.

### 3.2 Idea visual: «el ciclo completo, de un vistazo»
**El problema que resuelve:** hoy la página principal abre con un mapa y una fórmula. Quien llega no entiende de qué se trata.

**La propuesta:** la página principal cuenta la idea en **4 pasos con datos vivos**:

> **1 · Aviso oficial** (Senamhi) → **2 · Qué hacer** (tarjeta verificada) → **3 · La comunidad reporta** (por voz) → **4 · Ayuda que se puede comprobar** (entrega confirmada por la comunidad)

Cada paso es una tarjeta con su número real: el aviso vigente, las tarjetas verificadas, los reportes activos y las entregas confirmadas. Debajo va el mapa a pantalla ancha.

**Estilo:** sobrio e institucional, con identidad andina sin folclorizar.

| Elemento | Decisión |
|---|---|
| **Fondo** | Hueso cálido `#FAF7F2`; tarjetas blancas con borde fino `#E7E1D8` y sombra muy suave |
| **Texto** | Casi negro cálido `#1C1917`; secundario `#57534E`, que **cumple AA** sobre blanco y hueso |
| **Color de marca** | Índigo profundo andino `#1E3A5F`: cabecera, enlaces y botones primarios |
| **Acento** | Terracota `#B45309` en detalles, pocas veces |
| **Alertas** | Rojo `#B91C1C`, naranja `#C2410C`, amarillo ocre `#A16207`, verde `#15803D`: versiones oscuras que **cumplen AA con texto blanco**. El nivel se indica siempre con **color + palabra + ícono**, nunca solo con color |
| **Tipografía** | Títulos en **Fraunces** (serif con carácter, seria); texto en **Inter** (muy legible); cifras en *tabular-nums* |
| **Motivo gráfico** | Una línea fina escalonada, inspirada en el horizonte del Altiplano y los andenes, como separador y en la cabecera. Nada de tejidos ni chakanas decorativas |
| **Movimiento** | Mínimo: un pulso suave solo en el punto rojo del mapa y en el aviso vigente. Se respeta `prefers-reduced-motion` |

**Componentes compartidos** (en `components/ui/`): `Cabecera`, `Pie`, `Tarjeta`, `Insignia` (EJEMPLO, Verificada, nivel), `Boton`, `Aviso` (banda de alerta por nivel), `Cifra` (número grande con etiqueta), `Fuente` (cita con enlace), `Vacio` (estados vacíos).

### 3.3 Página por página
| Página | Cambios |
|---|---|
| **`/`** | Portada con la frase central ("Del aviso oficial a la ayuda que se puede comprobar"), los 4 pasos con datos vivos, banda del aviso vigente por nivel, mapa, ranking y "¿Cómo se calcula?" |
| **`/tarjetas`** | Cuadrícula por amenaza (Helada · Sequía · Nevada · Agua segura) y por fase (Antes · Durante · Después); filtros simples |
| **`/tarjetas/[id]`** | Formato nuevo (sección 6) |
| **`/entregas`** | Línea de tiempo con foto, cantidad, comunidad y la respuesta de la comunidad bien visible (Llegó · No llegó · Sin respuesta) |
| **`/probar`** | Chat con burbujas de alto contraste, botones grandes y la tarjeta igual que en la web |
| **`/suscribirse`** | QR grandes, tres pasos y qué se recibe |
| **`/fuentes`** (nueva) | Lista de fuentes oficiales (sección 6.3) |
| **`/comunidad/[id]`** (nueva) | Ficha pública (sección 8) |
| **`/panel/*`** | Mismo sistema visual, más denso; cabecera con usuario y "Salir" |

**Revisión (B):** en el celular, en modo claro y en modo oscuro, cada página. Anotar textos cortados y contraste.

## 4. Alerta corta y alarmante por nivel
**Objetivo:** que se entienda en 20 segundos y que llame la atención según la gravedad. **La gravedad la pone el Senamhi, nunca nosotros.**

### 4.1 Niveles
Hoy la alerta sale si el riesgo es medio o alto; con riesgo bajo no sale.

| Riesgo según el Senamhi | Encabezado | Tono |
|---|---|---|
| **Alto** | 🔴 **ALERTA ROJA · HELADA FUERTE** | Urgente: "Actúa hoy" |
| **Medio** | 🟠 **ALERTA NARANJA · HELADA** | Preventivo firme: "Prepárate desde hoy" |
| Bajo (no se envía) | — | — |

### 4.2 Texto (WhatsApp, Telegram y web)
```
🔴 ALERTA ROJA · HELADA FUERTE
Altiplano de Oruro · 14 al 23 de noviembre
El Senamhi anuncia heladas de hasta −8 °C. Riesgo ALTO para cultivos y animales.

QUÉ HACER HOY
1) …  2) …  3) …

Fuente oficial: Senamhi, boletín agrometeorológico decenal, p. 6
Ver el boletín original: https://senamhi.gob.bo/…
Audio con voz sintética · Si hay daños, responde con un audio.
```
- **Enlace:** el del PDF original del Senamhi (`bulletins.source_url`).
- **Fuente:** el resumen dice institución y página; no repite la cita completa.
- **Cifras:** las temperaturas o fechas salen **solo** de la cita extraída del boletín. Si el boletín no trae una cifra, no se pone.

### 4.3 Audio (≈ 20 s)
Guion fijo, sin enlace ni la línea de voz sintética:

> "Atención. Alerta roja por helada fuerte en el Altiplano de Oruro, del 14 al 23 de noviembre. Lo anuncia el Senamhi. Hoy mismo: [paso 1]. [paso 2]. [paso 3]. El enlace al boletín está en el mensaje."

- Voz Kore, ritmo algo más rápido que las tarjetas. El encabezado se repite al inicio para que capte la atención.
- **Contrato:** `construirMensajeAlerta` cambia de formato y se agrega `guionAudioAlerta(aviso, tarjeta)`. Va con prueba y una línea en `decisiones.md`.
- **Audio de alertas nuevas:** se genera **una sola vez al aprobar** la alerta en el panel (1 llamada de TTS). Si falla, la alerta sale solo con texto: nunca bloquea el envío. El audio del demo se genera antes del ensayo.

## 5. Login serio, solo para lo vital
**Público y sin login (transparencia):** mapa, ranking y desglose de la prioridad, aviso vigente, tarjetas, fuentes, entregas, fichas de comunidad, `/probar` y `/suscribirse`.

**Con login:**
- todo `/panel`: aprobar o descartar alertas, buscar boletín, corregir o descartar reportes, registrar entregas, reenviar tarjetas, Reiniciar demo;
- las transcripciones y audios de reportes, que son datos de personas.

**Cómo:**
- **Página `/ingresar`** con usuario y contraseña, en vez de la ventana del navegador.
- **Contraseñas** guardadas con **scrypt** (hash con sal), en `PANEL_USERS`. Nunca en texto plano ni en el repo.
- **Sesión:** cookie firmada (HMAC con `SESSION_SECRET`), `HttpOnly`, `Secure`, `SameSite=Lax`, vence a las 8 h. Botón **Salir**.
- **Roles:**
  - `tecnico`: aprobar, registrar y corregir;
  - `admin`: además, Reiniciar demo y buscar boletín.
- **Protección:**
  - `proxy.ts` redirige a `/ingresar` si no hay sesión;
  - **cada Server Action vuelve a validar la sesión y el rol** (no se confía solo en el proxy, según la guía de Next 16 `authentication.md`).
- **Intentos:** 5 fallos en 10 min por usuario e IP → espera de 10 min.
- **Registro:** cada acción guarda quién la hizo (ya existe `approved_by` y `registered_by`).
- **Nada de Supabase Auth:** quedó fuera del stack en el MVP.

## 6. Tarjetas más serias y completas
### 6.1 Formato nuevo (v0.4)
| Sección | Contenido | Regla |
|---|---|---|
| Encabezado | Amenaza + fase (Antes · Durante · Después), título e imagen | — |
| **Por qué importa** | 1 o 2 frases | Con fuente y página |
| **Qué hacer** | **3 a 5 pasos** con imagen | Cada paso con fuente y página (como hoy) |
| **Evita** | 0 a 2 cosas que no se deben hacer | Solo si la fuente lo dice |
| **Pide ayuda si…** | Cuándo avisar al municipio, y que se puede responder con audio al bot | Texto fijo + fuente si la hay |
| **Fuentes** | Lista con institución, documento, página y **enlace al original** | Obligatorio |
| Pie | Estado (Verificada contra fuente / Revisada por …), fecha de verificación, voz sintética | — |

- **Bot:** sigue enviando el resumen (título, pasos y fuente), con un enlace **"Ver tarjeta completa"**.
- **Contrato:** `Tarjeta` pasa a v0.4: `pasos` pasa a 3–5, y se agregan `por_que`, `evitar` y `pedir_ayuda`, cada uno con su fuente. Requiere migración y una línea en `decisiones.md`.

### 6.2 Tarjetas nuevas (de 6 a 12)
| id | Tema | Factor que cubre |
|---|---|---|
| `nevada-antes-01` | Prepararse para la nevada (forraje, corrales, accesos) | `perdida_por_nevada` |
| `nevada-durante-01` | Durante y después de la nevada (animales, techos, caminos) | `perdida_por_nevada`, `camino_cortado` |
| `helada-despues-01` | Después de la helada: revisar cultivos y animales | `perdida_por_helada` |
| `sequia-cultivos-01` | Cultivos en sequía: ahorrar agua de riego nuevo factor `cultivos_sin_agua` (cambio de contrato) |
| `agua-segura-01` | Agua segura para tomar cuando falta (guardar tapada, hervir) | `sin_agua_consumo` |
| `sequia-durante-animales-01` | Animales en sequía: agua y forraje priorizados | `sin_reserva_forraje` |

**Proceso para cada tarjeta:**
1. Claude redacta desde los PDFs de Drive y fuentes oficiales en línea, con la página citada en cada paso.
2. A o B verifican contra la fuente (10 min por tarjeta). **Si un paso no está en la fuente, no entra.**
3. Recién entonces se hacen imágenes, audio y PNG.

**Límite real:** 10 audios gratis por día de Gemini. Si se verifican las 6, alcanzan con justo para las 6 tarjetas, la alerta y la que falta. Si no se verifican, esas tarjetas no se publican.

### 6.3 Lista de fuentes oficiales (`/fuentes` y `data/fuentes.json`)
- **Cada fuente lleva:** institución, título, año, enlace al original, qué tarjetas la usan y fecha de consulta.
- **Ya usadas:**
  - Senamhi–INSA, Boletín Agrometeorológico Macro Región Altiplano;
  - FAO, Sistematización de buenas prácticas (TCP/RLA/3217);
  - CIPCA;
  - PreventionWeb / UNDRR, "Cuando hiela";
  - FAO/MDRyT.
- **A buscar y confirmar** (solo entran si el documento existe y es oficial): guías de VIDECI (Viceministerio de Defensa Civil) sobre heladas, nevadas y sequía; Ministerio de Medio Ambiente y Agua; Ministerio de Salud (agua segura); FAO Bolivia; Senamhi (avisos).
- **Regla:** ninguna fuente sin enlace verificable. Lo que no se pueda abrir y leer no entra.

## 7. Mapa más completo
- **Vista:** mapa base más limpio (CARTO Positron, con su atribución y la de OSM) y marcadores del color del nivel, con tamaño según las familias y pulso suave en los rojos.
- **Panel lateral sincronizado** en escritorio (debajo en el celular): lista de comunidades ordenada por prioridad. Al tocar una, el mapa vuela hasta ella y abre su ficha.
- **Filtros:**
  - por nivel (Muy alta, Alta, Media, Baja, Sin reportes);
  - por problema (Agua, Forraje, Daños);
  - "Sin entrega todavía".
- **Ficha de la comunidad (en el mapa):**
  - días sin agua o forraje;
  - familias;
  - desglose de la prioridad;
  - última entrega y si llegó;
  - enlace a la ficha pública.
- **Capa del aviso vigente:** banda superior con el nivel y la zona del Senamhi.
- **Extras:** botón de pantalla completa, leyenda fija y "Actualizado hace X s".
- **Accesibilidad:** la lista lateral es la alternativa al mapa para lectores de pantalla y teclado.

## 8. «Sin agua, a la vista»: que las comunidades sin agua se vean
**Idea:** convertir cada reporte confirmado en **evidencia pública que no se puede ignorar**. Todo con datos que la propia comunidad confirmó, sin datos personales.

1. **Contador de días sin agua** por comunidad, visible en el mapa, la portada y la ficha: **"Kantuta Pampa · 6 días sin agua · 40 familias · sin entrega todavía"**. El número sube solo cada día hasta que la comunidad confirma que llegó la ayuda.
2. **Ficha pública compartible `/comunidad/[id]`:**
   - el contador;
   - la línea de tiempo (reportó → confirmó → entrega registrada → la comunidad confirmó);
   - las fuentes;
   - botón **"Compartir por WhatsApp"** con un texto listo: *"Kantuta Pampa lleva 6 días sin agua (40 familias). Datos confirmados por la comunidad: <enlace>"*. Así las propias comunidades, dirigentes y medios la hacen circular.
3. **Tiempo de respuesta público:** cuántas horas pasan desde el reporte hasta la entrega, y desde la entrega hasta que la comunidad confirma. Es el indicador de rendición de cuentas.
4. **Resumen semanal para autoridades y prensa** (`/resumen`, imprimible): comunidades sin agua, días acumulados, familias, entregas y pendientes. Se puede llevar impreso a la Gobernación o al municipio.
5. **Afiche con QR por comunidad** (C): QR a su ficha, para la sede comunal o la escuela.

**Por qué funciona:** la falta de agua en comunidades pequeñas no llega a las noticias porque no hay datos. Aquí los datos los genera la comunidad, se ven en un mapa público y se comparten con un enlace. Nada depende de que alguien "decida" mostrarlos.

**Cuidados:**
- sin nombres ni teléfonos;
- lo de ejemplo sigue marcado como **EJEMPLO**;
- el texto para compartir describe hechos confirmados y no exagera.

## 9. Imágenes nuevas (Higgsfield, A)
Instrucciones en `docs/prompts-imagenes.md`, sección **"Lote 2"**.
- **Ahora:** las que no dependen del texto de los pasos (portada, ilustraciones de los 4 pasos del ciclo, encabezados de las 6 tarjetas nuevas) y los 2 pasos que faltan de `sequia-antes_familia-01`.
- **Después:** las de cada paso de las tarjetas nuevas, cuando sus pasos estén verificados (~05:00). Se agregan a la misma sección.

## 10. Riesgos y qué se cae primero
| Si falta tiempo… | Se recorta |
|---|---|
| A las 08:00 el rediseño no cubre todo | `/panel` queda con el estilo actual, pero con el arreglo de contraste |
| Las tarjetas nuevas no se verifican a las 09:00 | Se publican solo las verificadas; el resto queda en borrador (no se rellena) |
| No hay cupo de TTS | Las tarjetas nuevas salen sin audio, con la etiqueta en texto |
| El resumen semanal o el afiche no llegan | Quedan como "siguiente paso" en la presentación |

**Lo que nunca se recorta:** fuente y fecha en cada mensaje, voz sintética declarada, EJEMPLO visible, aprobación humana de cada alerta, cero secretos en el repo.
