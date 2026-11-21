# Plan de tarjetas — Emergencia Altiplano (v1, sáb 21 nov 12:40)

Complementa `docs/mvp.md` (M5) y `docs/plan.md`. Si algo se contradice, manda este archivo para las tarjetas.

## 1. Qué es una tarjeta "terminada"
Una tarjeta está terminada cuando cumple **las 10 condiciones**:
1. 3 pasos, cada uno en imperativo y con 18 palabras o menos.
2. Cada paso aparece en la página citada de la fuente (verificado por una persona del equipo, `verified_by`).
3. Sin dosis, medicinas, tratamientos ni diagnósticos.
4. `source_doc` y `source_page` completos (puede ser "p. 12; p. 14").
5. `status = verificada` con `verified_by` (o `revisada` con `reviewed_by`). `author` = autor del texto o guía de origen.
6. Cabecera ilustrada y, por paso, ilustración o ícono de respaldo.
7. Audio `.ogg` (Opus mono) y `.mp3`, generado con el texto final.
8. Se ve bien en web, en A4 impreso y (si hay PNG) en WhatsApp.
9. La etiqueta de estado es visible y verdadera.
10. Pasó la lista de pruebas del §9.

## 2. Las 6 tarjetas
| id | Tema | `factor_tags` | Fuente candidata (C confirma página) | Cabecera |
|---|---|---|---|---|
| `sequia-antes_familia-01` | Guardar y cuidar el agua de consumo | `sin_agua_consumo` | CIPCA agua / Practical Action | 01 tierra seca |
| `sequia-antes_animales-01` | Reserva de forraje | `sin_reserva_forraje` | FAO al930s / Helvetas | 02 llamas |
| `sequia-durante-01` | Agua y forraje cuando falta | `pozo_o_vertiente_seca`, `sin_agua_consumo` | FAO al930s | 03 cisterna |
| `helada-antes_familia-01` | Proteger cultivos antes de la helada | `cultivos_sin_proteccion_helada` | PreventionWeb "Cuando hiela" / FAO | 06 papa con helada |
| `helada-antes_animales-01` | Abrigo y corrales | `animales_sin_abrigo` | FAO/MDRyT as-961s (solo cuidados generales) | 05 llamas con muro |
| `helada-durante-01` | Durante la helada | `perdida_por_helada` | PreventionWeb "Cuando hiela" | imagen 7 (noche helada) o 05 con otro recorte |

**Las dos tarjetas del demo:** `sequia-durante-01` (la tarjeta que llega tras el reporte) y `helada-antes_familia-01` (la que acompaña la alerta del boletín, riesgo de helada en cultivos). Van **primero** en todo.

La ilustración 04 (nubes y brotes) no corresponde a ninguna tarjeta del MVP. Se usa en `/suscribirse` o en tarjetas de "después".

## 3. Anatomía y formatos
**Formato principal:** 1080×1350 (vertical 4:5). También vista web y A4 con CSS de impresión.

```
┌──────────────────────────────────┐
│ franja de cabecera (≈200 px)     │ ← ilustración 16:9 recortada (object-position: center 70%)
├──────────────────────────────────┤
│ [ícono amenaza] SEQUÍA · DURANTE │ ← insignia: ámbar = sequía, azul = helada
│ Título corto                     │
│ ┌────┐ 1  Texto del paso 1       │
│ │img │                           │ ← imagen cuadrada del paso (≈200 px) o ícono
│ └────┘                           │
│ ┌────┐ 2  Texto del paso 2       │
│ └────┘                           │
│ ┌────┐ 3  Texto del paso 3       │
│ └────┘                           │
├──────────────────────────────────┤
│ Fuente: documento, p. 12         │
│ ✔ Verificada contra fuente por   │
│   una segunda persona            │
│ 🔊 Voz sintética · Ilustraciones │
│ generadas con IA · logo          │
└──────────────────────────────────┘
```
- Texto de los pasos: mínimo 34 px sobre 1080 de ancho (legible en celular). Alto contraste.
- Íconos de respaldo (cuando un paso no tiene imagen): `lucide-react` (B busca los nombres exactos).
- Etiquetas de estado: "Verificada contra fuente" o "Revisada por [nombre]". Una tarjeta en `borrador` **no se muestra** al usuario.
- Si una tarjeta del menú no está disponible: "Esta tarjeta está en verificación".

**Mensaje del bot con tarjeta:** texto (título, 3 pasos, fuente con página, estado) + audio (`.ogg`) + imagen PNG solo si existe. El PNG es opcional: B lo exporta a mano desde la página de cada tarjeta cuando la plantilla esté lista.

## 4. Contrato: cambios y columnas
`lessons` / `Tarjeta` (A los aplica con los cambios de `docs/mvp.md` §3):
- `author text not null` (autor del texto o guía de origen), `verified_by text`, `reviewed_by text`; `verificada` exige `verified_by`.
- `header_image_path text`, `step_image_paths text[]` (hasta 3, nulo o vacío = ícono).
- `audio_ogg_path text`, `audio_mp3_path text` (reemplazan a `audio_path`).

**Hoja de cálculo en Drive (la mantiene C), pestaña `tarjetas`** — se exporta a CSV para el seed:
`id, hazard, phase, title, paso_1, paso_2, paso_3, factor_tags, source_doc, source_page, source_url, author, verified_by, reviewed_by, status, header_image, paso1_image, paso2_image, paso3_image, audio_ogg, audio_mp3`

**Pestaña `verificacion`** (solo en Drive, **no va al repo**): `id, paso, cita_literal_de_la_fuente, pagina, revisor, ok (sí/no), observación`. Las citas literales se quedan en Drive; en el repo público solo van los pasos redactados y la referencia de página.

## 5. Flujo de producción (por tarjeta)
| # | Paso | Responsable | Entrada → salida | Tiempo |
|---|---|---|---|---|
| 0 | **Fuentes:** descargar los documentos, anotar enlace y páginas relevantes | C | PDF → carpeta `fuentes/` | 15 min en total |
| 1 | **Redacción:** extraer 3 pasos concretos, reescribir en imperativo (≤ 18 palabras). Anotar la cita literal y la página en la pestaña `verificacion` | C (autor) | fuente → fila en `tarjetas` (`borrador`) | 20 min por tarjeta |
| 2 | **Pre-chequeo (opcional):** C pega aquí los 3 pasos y las citas; yo marco diferencias de significado, de cifras o añadidos | Claude | pasos + citas → lista de observaciones | 3 min |
| 3 | **Verificación cruzada:** otra persona comprueba cada paso contra la página citada y firma | A o B | fila + fuente → `verificada`, `verified_by` | 10 min por tarjeta |
| 4 | **Revisión técnica (opcional):** docente o técnico (agronomía/veterinaria/municipal) | A o C gestiona | tarjeta → `revisada`, `reviewed_by` | si se consigue |
| 5 | **Texto congelado.** Desde aquí, un cambio de texto obliga a regenerar audio e imagen del paso | — | — | — |
| 6 | **Imágenes por paso** (otra cuenta de Higgsfield) | Jhonatan | pasos finales → 3 imágenes por tarjeta | 15 min por tarjeta |
| 7 | **Revisión de imágenes:** contra el paso y la fuente | C + Claude | imágenes → aprobadas / repetir / ícono | 5 min por tarjeta |
| 8 | **Audio:** guion → Gemini TTS → ffmpeg → `.ogg` y `.mp3` → Storage | C | texto final → audios | 10 min por tarjeta |
| 9 | **Carga:** exportar CSV, correr el seed, comprobar en `/tarjetas` | B | CSV → base de datos | 10 min |
| 10 | **Pruebas** (§9) | C | — | 15 min |

### Reglas de redacción
- Verbo en imperativo: "Guarden…", "Cubran…", "Reúnan…".
- Una acción por paso. Sin cifras, medidas ni frecuencias si la fuente no las da con claridad en esa página.
- Si la fuente es ambigua o dice algo distinto en dos lugares, **no entra**. Se busca otro paso.
- Nada de dosis, productos veterinarios, medicinas ni diagnósticos. La cartilla de sanidad de camélidos (as-961s) se usa solo para cuidados generales.
- Si una tarjeta no llega a 3 pasos verificables, se queda en `borrador` y se avisa. No se rellena.

### Guion del audio (plantilla)
> "{título}. Paso uno: {paso_1}. Paso dos: {paso_2}. Paso tres: {paso_3}. Fuente: {source_doc}, página {page}. Mensaje con voz sintética."
- Escribir los números y símbolos como se pronuncian ("menos ocho grados", no "-8 °C").
- Duración esperada: 30 segundos o menos. Escucharlo completo antes de subirlo.
- Conversión: `ffmpeg -i in.wav -c:a libopus -ac 1 -b:a 32k {id}.ogg` y `ffmpeg -i in.wav -b:a 64k {id}.mp3`. Si Gemini TTS entrega PCM crudo, anteponer `-f s16le -ar 24000 -ac 1`.

## 6. Imágenes por paso: reglas
1. Se generan **solo con el texto final** y la tarjeta `verificada`.
2. Muestran el **resultado o la situación**, nunca una técnica ni detalles de construcción.
3. Una idea por imagen. Sin personas, rostros ni manos. Sin texto, números ni logos. Los animales son llamas.
4. Mismo estilo que las cabeceras (bloque de estilo), composición 1:1 centrada.
5. Si un paso pide una medida, cantidad o método concreto, **no se dibuja**: queda con ícono.
6. C revisa cada imagen contra el paso y la fuente: si añade o cambia algo, se descarta.
7. La tarjeta declara "Ilustraciones generadas con IA; siga el texto".
8. **Prioridad de generación:** `sequia-durante-01` → `helada-antes_familia-01` → `sequia-antes_familia-01` → `helada-antes_animales-01` → `sequia-antes_animales-01` → `helada-durante-01`.
9. Presupuesto: 2 variantes por paso (36 imágenes en total). Antes de empezar, revisar el saldo de la prueba. Si no alcanza, las tarjetas que faltan usan íconos.
10. Optimizar a 1200 px y JPG antes de pasarlas a B (cada una debería pesar menos de 200 KB).

Prompt de generación: ver el mensaje "Prompt para tu otra cuenta" de la conversación (se pega junto con el bloque de estilo).

## 7. Cronograma
| Cuándo | Qué | Quién |
|---|---|---|
| Sáb 12:40–13:00 | Descargar fuentes y anotar enlaces (la prueba de audio va primero) | C |
| Sáb 14:30–15:30 | Redactar `sequia-durante-01`, `sequia-antes_familia-01`, `sequia-antes_animales-01` | C |
| Sáb 15:30–16:30 | Redactar `helada-antes_familia-01`, `helada-antes_animales-01`, `helada-durante-01` | C |
| Sáb 15:45–17:00 | Verificación cruzada, por tarjeta a medida que C las termina. Pre-chequeo con Claude si hay tiempo | A o B |
| Sáb 17:00 | **Texto congelado** de las tarjetas verificadas. Las que no llegaron quedan en `borrador` | — |
| Sáb 16:30–18:00 | Imágenes por paso, en el orden de prioridad | Jhonatan |
| Sáb 17:00–18:00 | Audios de las 6 tarjetas y de la bienvenida | C |
| Sáb 18:00 | Carga de tarjetas en la base (seed) | B |
| Dom 9:00–10:00 | Repetir imágenes descartadas, revisión final, optimizar | Jhonatan + C |
| Dom 10:00–11:45 | Plantilla de tarjeta (web, A4) con filas de pasos; `/tarjetas`; PNG de las dos tarjetas del demo | B |
| Dom 11:45 | Si hay revisión técnica: pasar a `revisada` | C |
| Dom 12:30 | **Congelado.** Desde aquí solo se corrige un error real | todos |
| Dom 14:00–16:30 | Correcciones. Un cambio de texto implica regenerar el audio y la imagen del paso | C |

**Si algo se atrasa:** primero se recorta la imagen por paso (íconos), luego el PNG, luego la vista A4. **Nunca** se recorta la verificación ni el audio de las dos tarjetas del demo.

## 8. Por persona
**C:** fuentes (§5.0) · redactar 6 tarjetas con citas y páginas · audios (6 + bienvenida) · revisar imágenes · pruebas del §9.
**A o B (verificador):** comprobar cada paso contra la fuente y firmar `verified_by`. Reparto sugerido: A las de sequía, B las de helada.
**B:** seed con el CSV de tarjetas · plantilla de tarjeta (1080×1350, A4) · `/tarjetas` y `/tarjetas/[id]/imprimir` · íconos de respaldo con `lucide-react` · PNG opcional.
**Jhonatan:** aplicar el cambio de contrato · generar y optimizar las imágenes por paso · gestionar el revisor técnico si es posible.
**Claude (aquí):** pre-chequeo de pasos y citas · revisión de imágenes · ajustes de prompts.

## 9. Pruebas de las tarjetas (C, dom 10:30)
1. En `/tarjetas`, las 6 se ven, con su estado y su fuente.
2. En el celular, el texto de los pasos se lee sin hacer zoom.
3. La versión A4 imprime en una sola hoja, con las imágenes y la fuente.
4. El audio de cada tarjeta se oye completo, con los números bien dichos, y coincide con el texto.
5. Menú del bot: las 6 combinaciones envían la tarjeta correcta.
6. Una pregunta libre ("¿cómo guardo agua?") elige la tarjeta correcta y no inventa otra.
7. Una pregunta de medicina ("¿qué vacuna…?") responde con el mensaje fijo.
8. Tarjeta en `borrador` → "Esta tarjeta está en verificación".
9. Ninguna imagen tiene texto ni muestra algo que el paso no dice.
10. El repo no contiene citas literales largas de las fuentes ni claves.

## 10. Riesgos
| Riesgo | Mitigación |
|---|---|
| **Aún no leímos las fuentes completas** (solo sabemos que existen y sus códigos) | C confirma cada paso en su página. Lo que no esté, no entra |
| Una fuente no tiene 3 pasos claros para un tema | Buscar en otra fuente de la lista o dejar la tarjeta en `borrador` |
| Marcar como verificada sin cotejar la fuente | `verified_by` obligatorio y la comprobación de cada paso en su página (la regla `verified_by <> author` se quitó el sáb 21/11: `author` es el autor de la guía) |
| Imagen que enseña algo equivocado | Reglas del §6 y revisión por C y Claude |
| Créditos de Higgsfield insuficientes | Íconos de respaldo; prioridad de generación |
| Licencia de las imágenes de la prueba gratis | Revisar los términos de la cuenta antes de publicar en el repo |
| Cambio de texto tarde | Regla de regenerar audio e imagen; texto congelado el sábado a las 17:00 |
| Sin revisor técnico | Estado `verificada`, y en el pitch: la revisión técnica es requisito del piloto |
| Cita literal larga de una fuente en un repo público | Las citas solo van en la pestaña `verificacion` de Drive |

## 11. Pendientes por decidir
1. ¿Se genera la imagen 7 (noche helada) para `helada-durante-01`, o se reutiliza la 05?
2. ¿Quién verifica sequía y quién helada (A/B)?
3. ¿Hay un revisor técnico disponible (docente o técnico municipal)?
4. Confirmar que A aplica los campos nuevos de contrato antes de las 14:30.
