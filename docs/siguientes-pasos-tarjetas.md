# Siguientes pasos: de tarjetas en borrador a tarjetas listas para el demo

> **Paso a paso ejecutable** (lista de los 18 pasos, comandos exactos, pruebas finales y qué hacer si algo falla): [`docs/instructivo-salida-tarjetas.md`](instructivo-salida-tarjetas.md). Los audios ya tienen su script: `npm run generar:audios` (y `-- --alerta` para la alerta del demo).

**Estado (sáb 21/11, 16:30):** las 6 tarjetas del menú están en Supabase en **borrador**, con 3 fuentes cada una, `author` = institución de la fuente, y encabezado e imágenes por paso en Storage. El bot y la web **no las muestran** salvo con `DEMO_PERMITIR_BORRADOR=1`, y en ese caso salen con la franja "BORRADOR · sin verificar".

**Orden obligatorio:** verificar → volver a cargar → audios → PNG. **No exportar PNG ni generar audios antes de verificar**: si el texto o el estado cambian, hay que repetirlos.

| # | Qué | Quién | Hasta |
|---|---|---|---|
| 1 | Verificar las 6 tarjetas | **A y B** (no el agente de tarjetas) | sáb 18:00 |
| 2 | Pasar las verificadas a `verificada` y recargar la base | agente de tarjetas | sáb 18:15 |
| 3 | Generar y subir los audios de las tarjetas verificadas | agente de tarjetas (o C) | sáb 19:00 / dom 9:30 |
| 4 | Exportar los PNG | agente de tarjetas | dom 10:00 |
| 5 | Audio de la alerta del demo | agente de tarjetas (o C) | dom 10:30 |
| 6 | Quitar `DEMO_PERMITIR_BORRADOR` de Vercel | Jhonatan | antes del ensayo 1 |

---

## 1. Verificación (A y B) · unos 10 min por tarjeta
**Reparto:** A verifica las 3 de **sequía**; B las 3 de **helada**. Así nadie verifica lo que redactó.

Para **cada tarjeta** y **cada uno de sus 3 pasos**:
1. Abre `data/tarjetas/tarjetas.json` y busca la tarjeta por su `id`.
2. Mira el paso (`steps[i]`) y su fuente (`step_sources[i]`: documento y página).
3. Abre el PDF de esa fuente. Están en Drive › **DATOSPROYECTO**, y el boletín del Senamhi también está en senamhi.gob.bo. Ve a la página indicada **en el visor de PDF**.
4. Comprueba que **lo que dice el paso está en esa página**. Puede estar redactado distinto, pero no puede agregar nada que la fuente no diga.
5. Comprueba además:
   - es una acción en imperativo;
   - tiene **18 palabras o menos**;
   - **no** menciona dosis, medicinas, vacunas ni diagnósticos.
6. Anota el resultado en la pestaña `verificacion` del Excel de Drive (`id`, `paso`, `pagina`, `revisor`, `ok sí/no`, `observación`). Las citas literales se quedan en Drive y nunca van al repo.

**Resultado por tarjeta:**
- **Los 3 pasos OK:** avísale al agente de tarjetas *"`<id>` verificada por `<tu nombre>`"*.
- **Algún paso falla:** avísale *"`<id>` paso N no está en la página citada: `<lo que encontraste>`"*. La tarjeta queda en borrador hasta que se corrija y se vuelva a verificar. **No se rellena con texto inventado.**

**Prioridad:** si no da el tiempo para las 6, verifiquen primero las **dos del guion del demo**:
- `sequia-durante-01`: la que el bot manda después del reporte de falta de agua.
- `helada-antes_familia-01`: la que va dentro de la alerta de helada.

---

## 2. Instrucciones para el agente de tarjetas (copiar y pegar)

> **Contexto actualizado (sáb 21/11, 16:30). Tómalo como fuente de verdad sobre tu prompt anterior.**
>
> 1. **Autoría:** `author` es el autor del texto o guía de origen (institución), como ya lo dejaste. **Ya no existe la regla `verified_by <> author`**: está quitada del contrato, del esquema, de la migración y de las pruebas. `verificada` solo exige `verified_by`. La migración v0.3 **ya está aplicada** en Supabase.
> 2. **No exportes los PNG ni generes audios todavía.** Primero A y B verifican las tarjetas (ver `docs/siguientes-pasos-tarjetas.md`). Si exportas ahora, salen con la franja de borrador y `pngVigente` los descartará al cambiar el estado.
> 3. **Cuando A o B te confirmen una tarjeta** ("`<id>` verificada por `<nombre>`"):
>    - en `data/tarjetas/tarjetas.json` pon `"status": "verificada"` y `"verified_by": "<nombre>"`;
>    - corre `npm run seed:lecciones` y luego `npm run test:db`;
>    - si te reportan un paso que falla, corrígelo **solo con texto que esté en la página citada** (o cambia la fuente) y pide una nueva verificación de esa tarjeta. Si no hay forma, la tarjeta queda en borrador: no se rellena.
> 4. **Audios de las tarjetas verificadas.** Datos ya probados por A:
>    - modelo **`gemini-3.8-flash-tts`**, que **solo existe en la API `v1beta`**: `new GoogleGenAI({ apiKey, apiVersion: "v1beta" })`;
>    - la API que funciona es **`ai.interactions.create`** con `response_format: { type: "audio", mime_type: "audio/mp3" }` y `generation_config: { speech_config: [{ voice: "Kore", language: "es" }] }`. Con `generateContent` + `speechConfig` da error 400;
>    - **no entrega OGG/Opus.** Pide MP3 y convierte con `ffmpeg -i x.mp3 -c:a libopus -ac 1 -b:a 32k -application voip x.ogg`;
>    - **manda solo el texto exacto**: la voz lee en voz alta cualquier instrucción ("lee con voz clara…");
>    - el ejemplo completo está en `scratch/probar-voz-texto-solo.mjs`. Sube con tu `npm run subir:audios`, que completa `audio_ogg_path` y `audio_mp3_path`.
> 5. **PNG:** cuando las del menú estén verificadas y con audio, corre `npm run exportar:tarjetas` **sin** `DEMO_PERMITIR_BORRADOR`. Las que sigan en borrador no deben exportarse.
> 6. **Audio de la alerta del demo** (después de verificar `helada-antes_familia-01`):
>    - el texto es el `message_text` exacto que arma `construirMensajeAlerta` con el fixture `fixtures/aviso-altiplano-2026-11-2.json` y esa tarjeta;
>    - genera MP3 y OGG con el mismo método y súbelos al bucket `audios` como **`alertas/altiplano-2026-11-2.mp3`** y **`alertas/altiplano-2026-11-2.ogg`**;
>    - `lib/boletin.ts` los adjunta solo si existen con ese nombre exacto.
> 7. **No toques** `lib/bot/`, `lib/canales/`, `lib/boletin.ts`, `lib/alertas.ts` ni `lib/entregas.ts` (son de A). Si necesitas cambiar `contratos/`, avisa y anota en `decisiones.md`.
> 8. Antes de terminar: `npm run typecheck`, `npm run lint`, `npm test` y `npx next build` sin errores. Trabaja en una rama tuya, `feat/tarjetas-...`, y avisa antes de unir a `main`.

---

## 3. Para B
Además de la verificación de las 3 tarjetas de helada (punto 1), sus tareas de interfaz están en `docs/tareas-B.md`. Las APIs del panel ya existen, y sus contratos están ahí.

## 4. Para Jhonatan (A)
- Verificar las 3 de sequía (punto 1).
- En Vercel: `PANEL_USERS`, `CRON_SECRET` y `TECNICA_CONTACTO` (ver la explicación en el chat), y `DEMO_PERMITIR_BORRADOR=1` **solo mientras se prueba**. **Quitarla antes del ensayo 1.**
