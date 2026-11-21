# ⚠️ RECORDATORIO: las tarjetas se dejaron listas "para la demo" y hay que corregirlas

**Cuándo se hizo:** sáb 21/11/2026, tarde, a pedido de Jhonatan, para tener una demo funcional en el momento.
**Estado actual:** las 6 tarjetas están en `verificada` con `verified_by: "Jhonatan"`, con audio y PNG, y funcionan en producción sin `DEMO_PERMITIR_BORRADOR`.

> **La firma no es una verificación humana.** El cotejo contra los PDF lo hizo el agente de tarjetas (Claude) con `scratch/verificacion/fuentes/senamhi.pdf` y `fao.pdf`. **No había PDF de CIPCA.** El detalle paso por paso, con las citas, está en `scratch/verificacion/resultado-verificacion-2026-11-21.md` (no va a git).

---

## 1. Textos que se cambiaron para la demo (revisar uno por uno)

| Tarjeta | Antes (texto del equipo) | Ahora (demo) | Por qué |
|---|---|---|---|
| `helada-antes_familia-01` · paso 1 | página **p. 7** | página **p. 6 y 7** (el texto no cambió) | "almácigos" está en Senamhi p. 6 (Altiplano Norte); "parcelas" en p. 7. |
| `sequia-antes_animales-01` · paso 2 | "Rota el pastoreo en los bofedales y evita el sobrepastoreo." (Senamhi p. 6; CIPCA p. 5) | "Rota el pastoreo en los bofedales y en las praderas nativas." (Senamhi p. 6 y 8) | "evita el sobrepastoreo" no está en Senamhi; dependía de CIPCA, que no teníamos. |
| `sequia-antes_familia-01` · paso 1 | "Capta y guarda el agua de lluvia en **tanques**, reservorios o qotañas." (FAO p. 50–51; CIPCA p. 6) | "Capta y guarda el agua de lluvia en reservorios o qotañas." (FAO p. 50–51) | "tanques" no está en FAO. |
| `sequia-antes_familia-01` · paso 2 | "Cuida las vertientes con acuerdos de la comunidad." (CIPCA p. 6 y 9) | "Antes de hacer una qotaña, revisa el tipo de suelo." (FAO p. 51) | Solo estaba en CIPCA. |
| `sequia-antes_familia-01` · paso 3 | "Si riegas, usa goteo o aspersión: gastas menos agua." (CIPCA p. 7) | "Junta agua en la época de lluvias para tus animales en los meses secos." (FAO p. 51) | Solo estaba en CIPCA. |

Además cambiaron, en consecuencia: `author` (`sequia-antes_familia-01` = "FAO"; `sequia-antes_animales-01` = "FAO; Senamhi–INSA"), `source_doc`, `source_page` y los guiones de `data/tarjetas/guiones_audio.json`. Los textos originales están en git: `git show 520f470:data/tarjetas/tarjetas.json`.

## 2. Ilustraciones retiradas
`sequia-antes_familia-01` pasos 2 y 3 muestran ahora el **ícono** de respaldo: sus ilustraciones eran de vertientes y riego por goteo, y ya no corresponden al texto. Siguen en el disco como `assets/lessons/sequia-antes_familia-01/paso2.obsoleta-vertientes.webp` y `paso3.obsoleta-goteo.webp`.

## 3. Qué hay que hacer para cerrarlo
1. **Conseguir el PDF de CIPCA** y decidir, para cada fila de la tabla 1, si se vuelve al texto original (si CIPCA lo respalda en la página citada) o si se queda el de la demo.
2. **Cotejo manual** de las 6 tarjetas por una persona del equipo (`docs/instructivo-salida-tarjetas.md`, paso 1). Si alguna falla: `npm run verificar:tarjeta -- <id> --borrador` y después `npm run seed:lecciones`.
3. Si se cambia un texto: `npm run verificar:tarjeta -- <id> --borrador`; corregir `tarjetas.json` **y** el guion en `guiones_audio.json`; verificar de nuevo (`--por "<nombre>"`); y luego `seed:lecciones`, `generar:audios`, `subir:audios` y `exportar:tarjetas`. Si cambia `helada-antes_familia-01`, también `generar:audios -- --alerta --rehacer`.
4. Si se vuelve a un paso con ilustración, renombrar el `.obsoleta-*.webp` a `pasoN.webp` y correr `npm run subir:imagenes`.
5. **Escuchar los 6 audios y el de la alerta.** Se revisaron con transcripción automática, no de oído. Hay que confirmar que "qotaña", "Senamhi", "Quillacas" y "aporque" se entiendan.
6. Borrar este archivo y la entrada en `decisiones.md` → Pendientes.

## 4. Otros pendientes vistos al prepararla
- **Menú "🌱 Cultivos · ahora" → `helada-durante-01`**, que es una tarjeta de **animales**. En la demo, mejor no mostrar esa opción.
- **Audio de la alerta: dura 65 s.** Lee el mensaje completo, con citas y fuentes. Solo se adjunta si el boletín entra por **"Buscar boletín ahora"** o por el cron (clave `altiplano-2026-11-2`); por la subida manual, la alerta sale sin audio.
- **Se corrigió "pág. p. 6"** (la página salía duplicada) en `contratos/tipos.ts` (plantilla de alerta), `lib/canales/telegram.ts`, `lib/canales/whatsapp.ts` y `components/probar/Chat.tsx`. Ahora `fuente` ya lleva la página de cada paso.
