# Instructivo: imágenes por paso de las tarjetas (Higgsfield)

**Para:** quien genere las imágenes (Jhonatan / A). **Preparado:** dom 22/11, 10:30, Agente SERVIDOR.
**Resultado:** cada paso de cada tarjeta con su ilustración, en lugar del ícono de respaldo.

## 1. Qué hay que generar

| Grupo | Tarjeta | Imágenes | Estado de la tarjeta |
|---|---|---|---|
| **A. Publicadas sin imágenes de paso** | `nevada-antes_animales-01` | 4 pasos | verificada |
| | `helada-despues-01` | 3 pasos | verificada |
| | `sequia-durante-02` | 4 pasos | verificada |
| | `sequia-durante-03` (agua segura) | pasos 1–3 ya; 4–5 según la decisión de la sección 4 | verificada |
| | `sequia-durante-04` | 3 pasos | verificada |
| **B. Se pueden implementar (fuente leída)** | `sequia-despues-01` (nueva) | 1 encabezado + 4 pasos | **por redactar y verificar** |
| **C. No se generan** | nevada durante/después, nevada en cultivos y agua, helada durante en cultivos | — | **sin fuente oficial legible**: no hay tarjeta, así que no hay imágenes |

**Total:** 17 imágenes seguras ahora (grupo A sin los pasos 4–5 de agua segura), entre 1 y 2 según la decisión de agua segura, y 5 de la tarjeta nueva si se aprueba.

Las 6 tarjetas originales ya tienen sus 18 imágenes de paso: no se tocan.

## 2. Cómo generarlas en Higgsfield

1. **Referencia de estilo:** adjunta `ilustracion_05_helada_amanecer.jpg` (la misma de los lotes 1 y 2), para que todo sea de una sola familia.
2. **Formato:** cuadrado **1:1**. Encabezados: **16:9**.
3. **Prompt:** pega al inicio el **bloque de estilo** (abajo) y después la línea `Scene:` de cada paso.
4. **2 variantes** por prompt; elige la mejor.
5. **Rechaza** la imagen si tiene:
   - texto, letras, números o logos;
   - personas o manos;
   - animales que no sean llamas;
   - algo que contradiga el paso (por ejemplo, un frasco de medicina).
6. **Guarda** cada PNG con el nombre exacto `<id>_pasoN.png` en `D:\Jonathan\Desktop\SOFTWARE\Hackathon\assets\higgsfield\lote3\` y avisa.

**Bloque de estilo** (igual que en `docs/prompts-imagenes.md`):
```
Flat editorial illustration with a soft painterly-vector look and subtle paper grain, same style as the attached reference image. Muted natural palette: sand ochre, terracotta, dusty blue, lavender dawn, off-white wool. Setting: Bolivian Altiplano near Oruro (high plateau, golden bunchgrass, low stone walls, distant snow-capped peaks). STRICT: no text, no letters, no numbers, no logos, no people, no hands, no tools held by anyone. Only llamas as animals. One clear central subject, simple composition, strong contrast so it reads at small size. Square 1:1 composition, subject centered with margin.
```

**Después (lo hace SERVIDOR, unos 15 min):**
1. Optimizar a WebP (≤ 200 KB) y copiar a `assets/lessons/<id>/pasoN.webp`.
2. `npm run subir:imagenes -- --ids <ids>`.
3. Volver a exportar los PNG.

Las imágenes **no cambian el texto verificado**: no hace falta re-verificar.

## 3. Grupo A · tarjetas publicadas (pasos cotejados otra vez con la fuente)

Leyenda: ✔ el paso está en la página citada · ⚠ está, pero con una lectura más amplia (se explica).

### `nevada-antes_animales-01` — Prepara a tus animales antes de la nevada
Fuente: FAO, *Sistematización de Buenas Prácticas en la comunidad de Caylloma* (TCP/RLA/3217), https://www.fao.org/4/al927s/al927s.pdf

| Paso | Texto | Página | Cotejo |
|---|---|---|---|
| 1 | Resguarda a las crías y a las madres en cobertizos con techo ante heladas, nevadas o granizadas. | p. 15 | ✔ los corrales sin techo exponen a los recién nacidos a heladas, granizadas y nevadas; los cobertizos reducen la mortandad |
| 2 | Si no tienes calamina, techa el cobertizo con ichu. | p. 15 | ✔ "utilización de recursos como el ichu para reemplazar los techos de calamina" |
| 3 | Siembra forraje, como avena forrajera o trébol, y guárdalo para las épocas críticas. | p. 16 | ✔ siembra de trébol y avena forrajera, almacenado como ensilado, para épocas críticas |
| 4 | Da ese forraje primero a las madres gestantes y a las crías. | p. 16 | ⚠ la fuente dice que así "aseguran el capital pecuario madres gestantes y crías"; "primero" es nuestra lectura de esa prioridad |

| Archivo | Scene |
|---|---|
| `nevada-antes_animales-01_paso1.png` | A stone llama shelter with a solid sloped roof, a mother llama and her small cria resting inside, dry and protected, while the first snowflakes start to fall outside under heavy grey-violet clouds. |
| `nevada-antes_animales-01_paso2.png` | Close view of a stone shelter whose roof is made of thick bundles of golden ichu (bunchgrass) tied over wooden poles; a pile of fresh ichu bundles on the ground beside the wall; no metal sheets anywhere. |
| `nevada-antes_animales-01_paso3.png` | A small green plot of oat forage growing inside a low stone wall, and next to it a covered stack of dry forage bales under a straw roof, ready for winter. |
| `nevada-antes_animales-01_paso4.png` | A pregnant female llama (visibly round belly) and a small cria eating from a wooden feeder filled with forage inside a corral, while other adult llamas wait behind a low stone wall. |

### `helada-despues-01` — Después de la helada: ayuda a tu papa a recuperarse
Fuente: FAO, *Sistematización de buenas prácticas* (TCP/RLA/3217), caso Yapuchiris, https://www.fao.org/4/al930s/al930s.pdf

| Paso | Texto | Página | Cotejo |
|---|---|---|---|
| 1 | Aplica abono foliar orgánico a la papa dañada por la helada para que se recupere. | p. 28–29 | ✔ "abono foliar orgánico para recuperar cultivos dañados por heladas"; se aplicó 3 veces "para recuperar daños por heladas" |
| 2 | Prepara el abono con bosta fresca de vaca, jugo de alfalfa, leche, chancaca y levadura. | p. 28–29 | ✔ son los materiales que lista la fuente (también menciona gallinaza y cáscara de huevo) |
| 3 | Déjalo fermentar en un turril cerrado unos 25 días antes de usarlo. | p. 29 | ✔ "fermentación anaeróbica por un periodo aproximado de 25 días" en un turril |

| Archivo | Scene |
|---|---|
| `helada-despues-01_paso1.png` | A row of potato plants after a frost: some leaves darkened at the edges, fine droplets of a natural liquid fertilizer glistening on the leaves, a plain backpack sprayer resting on the ground at the end of the row, nobody holding it. |
| `helada-despues-01_paso2.png` | On a low stone table outdoors: a clay bowl of fresh green alfalfa juice, a bundle of alfalfa, a small jug of milk, a round block of dark cane sugar (chancaca), and a bucket; a plastic drum in the background. No labels, no text. |
| `helada-despues-01_paso3.png` | A large closed blue plastic drum with a tight lid, standing in the shade of an adobe wall, soft sun and moon arcs in the sky suggesting days passing (no numbers, no calendar). |

### `sequia-durante-02` — Cultivos en sequía: cuida la humedad del suelo
Fuente: Senamhi–INSA, *Boletín Agrometeorológico Macro Región Altiplano*, 14–23 nov 2026, https://senamhi.gob.bo/agromet/boletines_agrometeorologia/boletines_decenales/2026/NOVIEMBRE/2%20DECENA/1%20BOLET%C3%ADN%20ALTIPLANO%202026-11-2.pdf

| Paso | Texto | Página | Cotejo |
|---|---|---|---|
| 1 | Prefiere variedades precoces y tolerantes a la sequía y a la helada. | p. 7 | ✔ "Priorizar variedades precoces y tolerantes a sequía/helada" |
| 2 | Haz labranza mínima para conservar la humedad del suelo. | p. 7 | ✔ "ejecutar labranza mínima para conservar la humedad del suelo" |
| 3 | Da riego suplementario a las parcelas de haba, papa y hortalizas. | p. 7 | ✔ "aplicar riego suplementario en parcelas de haba, papa y hortalizas" |
| 4 | Pon barreras contra el viento para proteger las plántulas de quinua y papa. | p. 6 y 7 | ✔ "barreras vivas/rompevientos… para proteger plántulas de quinua y papa" |

| Archivo | Scene |
|---|---|
| `sequia-durante-02_paso1.png` | Small piles of different native quinoa and potato seeds on a woven cloth over dry ground, next to a few sturdy young quinoa plants growing well in dry soil. |
| `sequia-durante-02_paso2.png` | A field where only narrow planting furrows are opened, leaving the rest of the soil and its dry plant cover undisturbed; the soil inside the furrow looks darker and slightly moist compared to the dry surface. |
| `sequia-durante-02_paso3.png` | A thin stream of water flowing from a small channel into a plot of broad bean (haba) and potato plants, the rest of the land dry and golden; a covered water tank at the edge. |
| `sequia-durante-02_paso4.png` | A row of dense native shrubs and a low stone wall acting as a windbreak beside a field of tiny quinoa and potato seedlings; dust blowing on the far side of the barrier, calm air on the protected side. |

### `sequia-durante-04` — Animales en sequía: suplemento para los que más lo necesitan
Fuentes: Senamhi–INSA (boletín, arriba) y FAO, *Manual de prácticas de manejo de alpacas y llamas*, cap. 4, https://www.fao.org/4/w3341s/w3341s02.pdf

| Paso | Texto | Página | Cotejo |
|---|---|---|---|
| 1 | Da heno o broza de quinua como suplemento, junto con agua limpia. | Senamhi p. 7 | ✔ "suministrar suplemento forrajero (heno, broza de quinua) y agua limpia" |
| 2 | Suplementa primero a las hembras preñadas y en lactancia, y a los animales jóvenes. | FAO p. 14 del PDF | ⚠ la FAO lo dice de dos suplementos concretos (bloques y paja tratada) que **no** recomendamos porque llevan urea; el Senamhi (p. 8) también prioriza a las hembras gestantes. Si se quiere más estricto: "Prioriza los bofedales para las hembras gestantes" (Senamhi p. 8), que ya está en `helada-durante-01` |
| 3 | Refuerza los cobertizos y corrales contra el viento. | Senamhi p. 7 | ✔ "reforzar cobertizos/corrales contra el viento para llamas, alpacas y ovinos" |

| Archivo | Scene |
|---|---|
| `sequia-durante-04_paso1.png` | Llamas eating from a pile of dry hay and pale quinoa stalks (broza) in a stone corral, a stone trough of clean water beside them, the pasture outside dry and yellow. |
| `sequia-durante-04_paso2.png` | A female llama nursing her cria and a young llama eating forage first at a feeder, while the rest of the herd waits in the background. |
| `sequia-durante-04_paso3.png` | A corral with a newly raised, taller stone wall on the windward side and a roofed corner, dust blowing outside the wall, llamas resting calmly on the sheltered side. |

## 4. `sequia-durante-03` — Agua segura (decisión pendiente)

**El problema:** la tarjeta publicada usa el CDC (EE. UU.), que dice **3 minutos** de hervido en altura. La **OPS/OMS** dice 1 minuto a nivel del mar y **1 minuto más por cada 1000 m**: en Oruro (~3700 m), unos **5 minutos**. Recomiendo pasar a la versión OPS (hay que volver a verificarla).

| | Versión publicada (CDC) | Versión recomendada (OPS/OMS) |
|---|---|---|
| 1 | Si el agua está turbia, fíltrala con un paño limpio o déjala asentar. | Si el agua está turbia, déjala asentar y pásala con cuidado a otro recipiente, o cuélala con una tela fina. *(OPS, Nota técnica 10, p. 4 ✔)* |
| 2 | Hierve el agua clara durante 3 minutos, el tiempo indicado para zonas altas. | Hierve el agua con fuerza un minuto, y un minuto más por cada 1000 metros de altura. *(p. 5 ✔)* |
| 3 | Deja enfriar el agua hervida y guárdala en recipientes limpios con tapa que cierre bien. | Guárdala en recipientes limpios y tapados, en un lugar fresco y oscuro. *(p. 3 ✔)* |
| 4 | Sirve el agua sin meter las manos ni objetos en el recipiente. | Usa recipientes de boca ancha con tapa que cierre bien: son fáciles de limpiar. *(p. 3 ✔)* |
| 5 | Lava el recipiente con agua y jabón, y enjuágalo bien con agua limpia. | — |

Fuente OPS: https://paho.org/sites/default/files/2019-12/Nota-tecnica-sobre-agua-saneamiento-higiene-10.pdf

**Imágenes:** los pasos **1 a 3 sirven para las dos versiones**: genéralos ya. El 4 y el 5, recién cuando se decida.

| Archivo | Scene | Versión |
|---|---|---|
| `sequia-durante-03_paso1.png` | A clean white cloth stretched and tied over the mouth of a clay pot, cloudy water above it and clearer water below; beside it a glass jar of water with the sediment settled at the bottom. | ambas |
| `sequia-durante-03_paso2.png` | A pot of clear water at a rolling boil on a simple adobe stove with a wood fire, steam rising, a small hourglass on the stove ledge (no numbers). | ambas |
| `sequia-durante-03_paso3.png` | Clean water containers with tight lids lined up on a low wooden shelf in a cool, shaded corner of an adobe kitchen, away from the window light. | ambas |
| `sequia-durante-03_paso4.png` | A water container with a narrow neck resting tilted on a wooden stand so that water pours directly into a cup below; nothing is inside the container. | solo CDC |
| `sequia-durante-03_paso5.png` | A freshly washed water container drying upside down on a wooden rack in the sun, a bar of soap and a basin of clean water next to it, a few soap bubbles on the rim. | solo CDC |
| `sequia-durante-03_paso4.png` | A wide-mouth water container with its tight lid set beside it, clean and open, showing how easy it is to reach inside to clean; a cloth folded next to it. | solo OPS |

## 5. Grupo B · tarjeta que se puede implementar

### `sequia-despues-01` — Después de la sequía: recupera los pastos nativos (animales)
Fuente: FAO, *Sistematización de buenas prácticas* (TCP/RLA/3217), caso Playa Vinto (Jach'a Suyu Pakajaqi, altiplano central), https://www.fao.org/4/al930s/al930s.pdf. Leída y cotejada el 22/11.

| | Texto propuesto | Página | Cotejo |
|---|---|---|---|
| Paso 1 | Trasplanta chilliwa en época de lluvias, entre septiembre y noviembre, o en lugares húmedos. | p. 39 | ✔ "Realizar el transplante en época de lluvias (entre septiembre y noviembre), o en lugares que garanticen la humedad suficiente" |
| Paso 2 | Elige plantas de chilliwa vigorosas y frondosas, y divídelas en varias plantas hijas. | p. 39 | ✔ "Identificar plantas de chilliwa vigorosas y frondosas para dividir las mismas en varias plantas" |
| Paso 3 | Prepara pequeños hoyos en el suelo para cada planta hija. | p. 39 | ✔ "Preparar pequeños huecos en el suelo para albergar las plantas hijuelos" |
| Paso 4 | Trasplanta en líneas rectas, como un cultivo sembrado. | p. 40 | ✔ (pie de foto) "Área de trasplante de pastos, como si fuera un cultivo sembrado en líneas rectas" |
| Por qué importa | La chilliwa resiste sequías, heladas y granizadas. Trasplantada con humedad, prende más del 90 %. | p. 39–40 | ✔ |
| Evita | No trasplantes en lugares secos: ahí la práctica no prospera. | p. 40 | ✔ |

Factor: `sin_reserva_forraje` · Fase: `despues` · En el menú: Animales.
**Para publicarla:** redactarla en `tarjetas.json` (borrador) → verificar → audio (1 TTS) → imágenes → PNG. Unos 30 minutos más la verificación.

| Archivo | Formato | Scene |
|---|---|---|
| `sequia-despues-01_header.png` | 16:9 | Early rainy season on the Altiplano after a long drought: the first green shoots in a pasture of native bunchgrass, light rain clouds over the peaks, a few llamas grazing on a slope, a small rainbow fading. |
| `sequia-despues-01_paso1.png` | 1:1 | A small field of moist dark soil under a soft rainy sky, rows of freshly planted tufts of native chilliwa bunchgrass, rain puddles shining. |
| `sequia-despues-01_paso2.png` | 1:1 | One large, healthy, leafy chilliwa bunchgrass clump lifted from the soil, already split into several smaller tufts with their own roots, laid on the ground side by side. |
| `sequia-despues-01_paso3.png` | 1:1 | A row of small, evenly spaced planting holes dug in moist soil, a few chilliwa tufts waiting beside them, a spade stuck upright in the ground, nobody holding it. |
| `sequia-despues-01_paso4.png` | 1:1 | Wide view of a pasture plot where young chilliwa tufts grow in straight, neat lines like a sown crop, llamas resting behind a low stone wall. |

## 6. Por qué no hay tarjetas (ni imágenes) para el resto

| Caso | Qué encontré | Qué haría falta |
|---|---|---|
| Nevada · durante y después | Solo notas de prensa (MIDAGRI/AgroRural Perú). VIDECI y Senamhi Bolivia no tienen una guía legible en línea | Guía oficial de VIDECI, Senamhi o FAO Bolivia sobre nevadas |
| Nevada · cultivos y agua | Nada | Igual que arriba |
| Helada · durante (cultivos) | Senamhi p. 6: "usar humaredas o coberturas en almácigos", una sola acción que ya está en la tarjeta de "antes" | Una guía con 3 acciones distintas para la noche de helada |
| Sequía · después (agua y cultivos) | Nada específico | Guía de rehabilitación (FAO, MMAyA) |

**Regla:** lo que no está en una fuente que se pueda abrir y leer no entra, aunque la matriz quede incompleta.
