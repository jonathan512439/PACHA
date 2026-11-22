# Demo: tarjetas con imágenes y editor de tarjetas (opción 2)

**Para:** quien presenta (Jhonatan) y quien lo acompaña. **Preparado:** dom 22/11, ~11:45, Agente SERVIDOR.

## 1. Lo que hay hoy
- **11 tarjetas verificadas y 1 en borrador.**
  - Las 5 tarjetas nuevas ya tienen la ilustración de cada paso, audio y PNG.
  - La tarjeta en borrador es `sequia-despues-01`.
- **Editor en el panel:**
  - `/panel/tarjetas`: versiones por verificar, editar, tarjeta nueva y retirar.
  - `/panel/fuentes`: registrar una fuente oficial con un enlace que se pueda abrir.
- **Dos versiones esperando tu verificación:**
  - **Agua segura con la OPS/OMS:** hervir 1 minuto más por cada 1000 m de altura, en vez de los 3 minutos del CDC. Mientras tanto se sigue enviando la versión del CDC.
  - **Tarjeta nueva «Después de la sequía: recupera los pastos nativos»** (FAO, trasplante de chilliwa), con sus 5 imágenes.

## 2. Antes del demo (5 min, una sola vez)
1. **Aplicar la migración** `contratos/migraciones/2026-11-22_editor_tarjetas.sql` en Supabase › SQL Editor. Al final debe listar `lesson_versions` y `sources`.
2. **Cargar las versiones por verificar:** en `Hackathon-servidor`, correr `npm run proponer:versiones`. Imprime dos enlaces `/panel/tarjetas/version/<id>`.
3. **Entrar al panel** con tu usuario.
   - En Vercel sigue el basic auth: con tu usuario de siempre eres admin.
   - Las versiones las redactó «Claude (asistente de redacción…)», así que **tú puedes verificarlas**: quien redacta no puede verificar.
4. **Opcional:** abrir el bot y escribir `0`. El menú ahora tiene 4 temas (sale ❄️ Nevada) y en WhatsApp va como lista.

## 3. Recorrido del demo (unos 2 min)
1. **El problema** (10 s): "Cada consejo tiene que salir de una fuente oficial, y alguien de la gobernación tiene que poder mantenerlos sin programar."
2. **Panel › Tarjetas › Por verificar › «Agua segura para tomar cuando falta»:**
   - Se ve lo que cambia: el texto vigente tachado y el nuevo debajo.
   - Toca «abrir OPS/OMS en esa página» en el paso 2: se abre el PDF de la OPS en la p. 5, donde dice "un minuto más por cada 1000 m de altitud".
   - Marca «Cotejé cada texto…» y **Verificar y publicar**. Firma tu usuario y se genera el audio.
3. **En el bot:** Agua › Está pasando ahora. Llega la versión nueva.
4. **Lo mismo con «Después de la sequía»:** tarjeta nueva, con imágenes por paso. Queda en Animales › Está pasando ahora.
5. **Panel › Fuentes:** cada fuente con su enlace y las tarjetas que la usan. "Si VIDECI publica su guía de nevadas, se registra aquí y desde ese día se puede citar."
6. **Cierre** (20 s): "Quien redacta nunca verifica. Editar no apaga la tarjeta vigente. Todo queda en el historial: quién, cuándo y por qué."

## 4. Si algo falla en vivo
| Qué pasa | Qué hacer |
|---|---|
| «Falta activar el editor» | No se aplicó la migración: paso 2.1 |
| «No hay versiones esperando verificación» | Correr `npm run proponer:versiones` |
| «Tú redactaste esta versión…» | Entrar con otro usuario: la regla de dos personas funciona |
| Publicada «sin audio» | Se acabó el cupo de voz o falló Gemini: la tarjeta sale igual, con texto e imágenes |
| La tarjeta del bot llega sin la imagen PNG | Normal tras publicar desde el panel: el PNG se regenera en la computadora con `npm run exportar:tarjetas` |

## 5. Después del demo (obligatorio antes de volver a correr el seed)
1. `npm run tarjetas:bajar`: trae al repo lo publicado desde el panel.
2. `npm run exportar:tarjetas`: PNG de las tarjetas editadas.
3. Subir el cambio a `main`.

**Si alguien corre `npm run seed:lecciones` sin el paso 1, el seed se detiene** y lo avisa, para no pisar lo publicado en el panel.

## 6. Qué cubre y qué no (decirlo si preguntan)
- **Cubierto con fuente:**
  - helada: antes (cultivos y animales), durante (animales) y después (cultivos);
  - sequía: antes (agua y animales), durante (agua, animales y cultivos) y después (pastos);
  - nevada: antes (animales).
- **Sin tarjeta porque no hay fuente oficial legible:**
  - nevada durante y después, y nevada en cultivos y agua;
  - helada durante en cultivos;
  - sequía después en agua y cultivos.
- **La regla:** no se rellena. Con el editor, cuando aparezca la guía oficial, la gobernación la registra y redacta la tarjeta sin esperar al equipo.
