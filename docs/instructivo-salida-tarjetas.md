# Instructivo: salida de las tarjetas (de borrador a listas para el demo)

**Para:** quien verifica (**A** las 3 de sequía, **B** las 3 de helada) y quien corre los comandos (cualquiera con el repo y el `.env`).
**Tiempo:** unos 10 min por tarjeta para verificar, más unos 30 min de comandos.
**Resultado:** las 6 tarjetas en `verificada`, con audio y PNG. El bot, la web y la alerta las muestran sin la franja de borrador.

> 🔒 **Reglas de oro**
> 1. **No se cambia el texto** de los pasos, títulos, fuentes ni páginas. Si algo está mal, se avisa a Jhonatan (paso 1.4).
> 2. **El archivo `data/tarjetas/tarjetas.json` manda.** El seed sobrescribe la base con lo que dice ese archivo: **nunca** cambies el estado a mano en Supabase, porque se pierde en el siguiente seed.
> 3. **Las citas literales de las fuentes van solo a Drive** (pestaña `verificacion`), nunca al repo, que es público.
> 4. **Las claves no se comparten** por el chat del grupo ni en capturas.

**Orden obligatorio:** verificar → marcar en el JSON → cargar → audios → PNG → producción → pruebas.
Los audios y los PNG dependen del texto y del estado: si se hacen antes de verificar, hay que repetirlos.

---

## Antes de empezar
- [ ] Repo al día: `git pull` y después `npm install`.
- [ ] Un `.env` en la raíz con `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY`. Usa **tu clave personal** de Gemini, **no** la del demo. Pide los valores a Jhonatan por privado.
- [ ] `ffmpeg` instalado: `ffmpeg -version` debe responder. En Windows se instala con `winget install Gyan.FFmpeg`.
- [ ] El navegador de Playwright, una sola vez: `npx playwright install chromium`.
- [ ] Los 3 PDF de las fuentes, en Drive › **DATOSPROYECTO**. El boletín también está en senamhi.gob.bo.
  - Senamhi–INSA, *Boletín Agrometeorológico Macro Región Altiplano*, decena 14–23 nov 2026.
  - FAO, *Sistematización de buenas prácticas (TCP/RLA/3217)*, caso Jach'a Suyu Pakajaqi y Yapuchiris.
  - CIPCA, *Propuestas de respuesta integral a la sequía en los valles interandinos* (nov 2024).

---

## Paso 1 · Verificar cada paso contra su fuente (A y B)

### 1.1 Qué se comprueba en cada paso
Abre el PDF en la página indicada. Usa **el número del visor de PDF**, no el que está impreso en la hoja. Marca ✅ solo si se cumplen las 4 condiciones:
1. **Lo que dice el paso está en esa página.** Puede estar redactado distinto, pero no puede agregar nada: ni cifras, ni cantidades, ni frecuencias, ni lugares que la fuente no diga.
2. Es **una acción**, en imperativo.
3. Tiene **18 palabras o menos**.
4. **No** menciona dosis, medicinas, vacunas ni diagnósticos.

Si la página trae una nota del tipo "(Altiplano Sur)", comprueba que la recomendación sea de esa zona.

### 1.2 Lista de pasos (en orden de prioridad)
Las dos primeras son las del guion del demo: si no da el tiempo para todas, **estas van primero**.

**A — sequía**

`sequia-durante-01` · "Qué hacer durante la sequía" · ⭐ demo (la que llega tras el reporte de falta de agua)

| Paso | Texto | Fuente | Página | ✅ |
|---|---|---|---|---|
| 1 | Conserva la humedad del suelo con labranza mínima. | Senamhi–INSA / CIPCA | Senamhi p. 7 (Altiplano Sur); CIPCA p. 8 | ☐ |
| 2 | Rota el pastoreo en los bofedales y suplementa con heno. | Senamhi–INSA | p. 6 y 8 | ☐ |
| 3 | Da agua limpia y forraje seco a los animales. | Senamhi–INSA | p. 7 (Altiplano Sur) | ☐ |

`sequia-antes_familia-01` · "Guarda agua antes de la sequía"

| Paso | Texto | Fuente | Página | ✅ |
|---|---|---|---|---|
| 1 | Capta y guarda el agua de lluvia en tanques, reservorios o qotañas. | FAO / CIPCA | FAO p. 50–51; CIPCA p. 6 | ☐ |
| 2 | Cuida las vertientes con acuerdos de la comunidad. | CIPCA | p. 6 y 9 | ☐ |
| 3 | Si riegas, usa goteo o aspersión: gastas menos agua. | CIPCA | p. 7 | ☐ |

`sequia-antes_animales-01` · "Prepara el forraje antes de la sequía"

| Paso | Texto | Fuente | Página | ✅ |
|---|---|---|---|---|
| 1 | Guarda el heno bajo techo para tener forraje en la época seca. | FAO | p. 43 | ☐ |
| 2 | Rota el pastoreo en los bofedales y evita el sobrepastoreo. | Senamhi–INSA / CIPCA | Senamhi p. 6; CIPCA p. 5 | ☐ |
| 3 | Planifica el empadre para que las crías nazcan cuando hay forraje. | FAO | p. 34 | ☐ |

**B — helada**

`helada-antes_familia-01` · "Prepara tus cultivos antes de la helada" · ⭐ demo (la que va dentro de la alerta de helada)

| Paso | Texto | Fuente | Página | ✅ |
|---|---|---|---|---|
| 1 | Usa coberturas en las parcelas y almácigos más delicados. | Senamhi–INSA | p. 7 | ☐ |
| 2 | Haz aporque temprano en las plántulas de papa y quinua. | Senamhi–INSA | p. 6 | ☐ |
| 3 | Siembra aprovechando la humedad que dejó la lluvia y riega poco, solo si hay agua. | Senamhi–INSA | p. 6 | ☐ |

`helada-antes_animales-01` · "Protege a tus animales antes de la helada"

| Paso | Texto | Fuente | Página | ✅ |
|---|---|---|---|---|
| 1 | Techa tus corrales de llamas y alpacas para protegerlos del frío. | FAO | p. 37 | ☐ |
| 2 | Guarda el heno bajo cobertizo, protegido de la lluvia. | FAO | p. 43 | ☐ |
| 3 | Vigila a las hembras gestantes y ten reservas de forraje seco. | Senamhi–INSA | p. 6 | ☐ |

`helada-durante-01` · "Cuida a tus animales durante la helada"

| Paso | Texto | Fuente | Página | ✅ |
|---|---|---|---|---|
| 1 | Resguarda a tus animales de noche en corrales con parapetos contra el viento. | Senamhi–INSA | p. 8 | ☐ |
| 2 | Prioriza los bofedales para las hembras gestantes. | Senamhi–INSA | p. 8 | ☐ |
| 3 | Dales heno como alimento adicional. | Senamhi–INSA | p. 8 | ☐ |

### 1.3 Anotar en Drive
En el Excel de Drive, pestaña `verificacion`, una fila por paso con estas columnas: `id`, `paso`, `pagina`, `revisor`, `ok (sí/no)`, `observación`. La cita literal de la fuente va **solo ahí**.

### 1.4 Resultado de cada tarjeta
- **Los 3 pasos ✅:** la tarjeta se puede marcar como verificada (paso 2).
- **Algún paso falla:** **no** se marca, y se le avisa a Jhonatan: *"`<id>` paso N no está en la página citada: `<lo que encontraste>`"*. La tarjeta queda en borrador: el bot y la web no la muestran y el menú la salta. **No se rellena con texto inventado.**

---

## Paso 2 · Marcar como verificada en el JSON
En `data/tarjetas/tarjetas.json`, busca la tarjeta por su `id` y cambia **solo** estas dos líneas:

```diff
-    "verified_by": null,
+    "verified_by": "<tu nombre>",
     "reviewed_by": null,
-    "status": "borrador"
+    "status": "verificada"
```

- Usa tu nombre de pila: el repo es público. Ese nombre **no** se muestra en la tarjeta; allí solo dice "Verificada contra fuente".
- Haz lo mismo en `data/tarjetas/tarjetas.csv` (columnas `verified_by` y `status`). Ese archivo es solo para leer, pero conviene que coincida.
- **Opcional, `revisada`:** si un técnico (agronomía, veterinaria o municipio) revisó la tarjeta, pon `"status": "revisada"` y su nombre en `"reviewed_by"`, además de `verified_by`.

---

## Paso 3 · Validar y cargar en la base
```sh
npm run seed:lecciones -- --validar   # comprueba sin tocar la base
npm test                              # pruebas del contenido
npm run seed:lecciones                # carga en Supabase
npm run test:db                       # confirma que los 6 ids del menú están en la base
```
**Debe decir:** `✔ 6 tarjetas validan…`, con el estado nuevo de cada una, y después `✔ Upsert de 6 tarjetas en lessons.`
Si una tarjeta no valida, **no se carga ninguna**: el mensaje dice qué tarjeta y por qué (ver "Si algo falla").

---

## Paso 4 · Audios (solo de las tarjetas verificadas)
```sh
npm run generar:audios                   # genera los audios que faltan de las tarjetas verificadas
npm run generar:audios -- --alerta       # audio de la alerta del demo (necesita helada-antes_familia-01 verificada)
```
- Los archivos quedan en `assets/audio/` (no van a git). Las tarjetas en borrador se saltan.
- **Escucha cada audio completo antes de subirlo:**
  - que diga exactamente el texto de la tarjeta;
  - que no lea nada de más;
  - que dure 30 segundos o menos.
- Si uno está mal, repítelo: `npm run generar:audios -- --ids <id> --rehacer`. Para probar otra voz, agrega `--voz Puck`.
- Cuando estén bien, súbelos:
```sh
npm run subir:audios
```
**Debe decir:** `✔ lessons/<id>.ogg` y `.mp3` por cada tarjeta, y `✔ alertas/altiplano-2026-11-2.ogg` y `.mp3`.

---

## Paso 5 · PNG de las tarjetas (para WhatsApp y Telegram)
1. En el `.env`, deja la variable **vacía**: `DEMO_PERMITIR_BORRADOR=`. Así solo se exportan las verificadas, sin franja de borrador.
2. Arranca el servidor (o **reinícialo** si ya estaba corriendo: la variable se lee al arrancar):
   ```sh
   npm run dev
   ```
3. Cuando diga "Ready", en **otra** terminal:
   ```sh
   npm run exportar:tarjetas
   ```
**Debe decir:** `✔ <id>: ~320 KB → lessons/<id>/tarjeta-verificada-<huella>.png` por cada tarjeta verificada. Si alguna sigue en borrador, aparece con `·` y el comando termina con código 1: es lo esperado.

**Revisa a ojo** un par de archivos en `exports/tarjetas/`:
- **no** tienen la franja roja "BORRADOR";
- el pie dice "✔ Verificada contra fuente";
- no hay imágenes rotas.

> Los PNG de borrador que se exportaron el sáb 21/11 siguen en Storage, pero el bot los ignora: el nombre lleva una huella del texto y del estado, y ya no coincide.

---

## Paso 6 · Producción (Jhonatan)
- En Vercel › proyecto `pacha` › Settings › Environment Variables: **no** debe existir `DEMO_PERMITIR_BORRADOR` en Production. Si se agregó para probar, se quita y se vuelve a desplegar.
- **Los datos no necesitan despliegue:** la web lee la base en cada visita. Después del seed (paso 3), producción ya muestra las tarjetas verificadas.
- **Comprobar:** en <https://pacha-lilac.vercel.app/tarjetas>, cada tarjeta verificada aparece con el enlace y "Verificada contra fuente".

---

## Paso 7 · Pruebas finales (antes del ensayo 1)
Marca cada una:

- [ ] **Web:** `/tarjetas` lista las 6. Las verificadas abren su tarjeta; las que sigan en borrador dicen "Esta tarjeta está en verificación".
- [ ] **Celular:** en `/tarjetas/sequia-durante-01`, los pasos se leen sin hacer zoom.
- [ ] **A4:** al imprimir `/tarjetas/helada-antes_familia-01` (Ctrl+P), sale en una sola hoja, con imágenes y fuentes.
- [ ] **Menú del bot** en Telegram (@pacha_oruro_bot), las 6 combinaciones:

  | Opción | Debe enviar |
  |---|---|
  | 💧 Agua · antes | `sequia-antes_familia-01` |
  | 💧 Agua · ahora | `sequia-durante-01` |
  | 🦙 Animales · antes | `sequia-antes_animales-01` y `helada-antes_animales-01` |
  | 🦙 Animales · ahora | `sequia-durante-01` y `helada-durante-01` |
  | 🌱 Cultivos · antes | `helada-antes_familia-01` |
  | 🌱 Cultivos · ahora | `helada-durante-01` ⚠️ ver "Pendiente" abajo |

  Cada tarjeta debe llegar con imagen, texto, fuente con página y nota de voz, y **sin** "[BORRADOR · sin verificar]" en el título.
- [ ] **Pregunta libre** "¿cómo guardo agua?" → `sequia-antes_familia-01`. No debe inventar otra respuesta.
- [ ] **Pregunta de medicina** "¿qué vacuna le pongo a mis llamas?" → mensaje fijo: "No damos medicinas, dosis ni diagnósticos…".
- [ ] **Reporte** por audio de falta de agua → al confirmar, llega `sequia-durante-01`.
- [ ] **Alerta:** en el panel, la alerta de helada permite **Aprobar**, y el mensaje incluye los 3 pasos de `helada-antes_familia-01` y su audio.

---

## Paso 8 · Guardar en git
Solo los datos de las tarjetas; imágenes, audios y PNG ya están en Storage:
```sh
git checkout -b feat/tarjetas-verificadas
git add data/tarjetas/tarjetas.json data/tarjetas/tarjetas.csv
git commit -m "Tarjetas: <ids> verificadas"
git push -u origin feat/tarjetas-verificadas
```
Y avisa a Jhonatan para unir la rama a `main`.

---

## Si algo falla

| Mensaje | Qué hacer |
|---|---|
| `verificada/revisada exige verified_by` | Falta tu nombre en `verified_by` (paso 2). |
| `Una tarjeta revisada necesita revisor` | Con `revisada` hay que llenar también `reviewed_by`. |
| `author "…" no aparece en ninguna fuente` | Alguien cambió `author`. Debe ser la institución de las fuentes (Senamhi–INSA, FAO, CIPCA): avisar a Jhonatan. |
| `No se cargó NINGUNA tarjeta` | Lee la lista de errores: dice qué tarjeta y por qué. Corrige solo eso y repite el paso 3. |
| `No responde http://localhost:3000` | Falta `npm run dev` en otra terminal (paso 5). |
| `No se exportó ninguna tarjeta` | Ninguna está verificada en la base: revisa los pasos 2 y 3. |
| El PNG tiene la franja "BORRADOR" | Se exportó antes de verificar, o el servidor tenía `DEMO_PERMITIR_BORRADOR=1`. Déjala vacía, reinicia `npm run dev` y vuelve a exportar. |
| `el guion no contiene: "…"` | El guion de audio (`data/tarjetas/guiones_audio.json`) no coincide con el texto de la tarjeta. Avisar a Jhonatan; no grabar. |
| `La tarjeta de la alerta … debe estar verificada` | Verifica y carga primero `helada-antes_familia-01`. |
| Error 429 o 503 de Gemini | Cuota o alta demanda: espera 1 minuto y repite. Los audios ya generados no se rehacen. |
| `No se encontró ffmpeg` | Instálalo (`winget install Gyan.FFmpeg`) y abre una terminal nueva. |
| La web de producción dice "en verificación" | La tarjeta sigue en borrador en la base: falta el paso 3 o el `status` del JSON. |

---

## Pendiente (decide Jhonatan)
- **🌱 Cultivos · ahora → `helada-durante-01`:** esa tarjeta trata de **animales** ("Cuida a tus animales durante la helada"), así que quien elige "cultivos" recibe consejos de animales. Opciones: redactar y verificar una tarjeta de cultivos durante la helada, o cambiar el mapeo del menú (`MENU` en `contratos/tipos.ts`). Hasta decidirlo, no mostrar esa combinación en el ensayo.
