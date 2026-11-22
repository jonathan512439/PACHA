# Diagnóstico de WhatsApp, paso a paso

**Para:** quien configure Meta (Jhonatan o Sergio) · **Tiempo:** unos 20 minutos.
**Situación (sáb 21/11, 21:40):** el bot no responde y **ningún mensaje llega a nuestro servidor**.

**Ya verificado de nuestro lado:**
| Pieza | Estado |
|---|---|
| URL del webhook | ✅ responde |
| *Verify token* | ✅ coincide entre Vercel y Meta |
| *App secret* | ✅ corresponde a la app **2340026593488679** |
| ID del número | ✅ `1371708939369587` (+1 555-141-3769) |
| Token | ✅ permanente |

**Conclusión:** Meta no está entregando los mensajes al webhook. Este instructivo revisa, en orden, cada eslabón que hay entre "mando hola" y "llega al servidor".

> 🔒 Nunca pegues el token ni el *App secret* en el chat del grupo ni en capturas. Los comandos de abajo los leen de tu `.env`.

## La cadena completa
```
Tu WhatsApp ──► Número de prueba (+1 555-141-3769)
                   │  pertenece a
                   ▼
            Cuenta de WhatsApp Business (WABA)
                   │  ¿tiene la app SUSCRITA?          ← Paso 4 (sospechoso nº 1)
                   ▼
            App de Meta "PACHA" (2340026593488679)
                   │  ¿webhook con el campo "messages"? ← Paso 3
                   ▼
            https://pacha-lilac.vercel.app/api/webhooks/whatsapp  ← Paso 5 (logs de Vercel)
                   │  firma con App secret ✅
                   ▼
            Bot (procesarMensaje) → respuesta con el token ✅
```

---

## Paso 1 · ¿Todo está en la MISMA app? (2 min)
1. Entra a <https://developers.facebook.com/apps>.
2. Abre la app **PACHA**. Arriba, junto al nombre, aparece el **ID de la app**: tiene que ser **`2340026593488679`**.
   - Si tienes **más de una app** con WhatsApp, revisa cada una. La URL del webhook y el número de prueba tienen que estar **en la misma app**.
3. En el menú izquierdo debe aparecer el producto **WhatsApp**, con **Configuración de la API** y **Configuración**.

✅ **Bien:** una sola app (2340026593488679) tiene el número y el webhook.
❌ **Mal:** el webhook está en otra app → configúralo en esta (paso 3).

## Paso 2 · Número, cuenta y destinatarios (3 min)
En **WhatsApp › Configuración de la API** (*API Setup*):
1. **De** (*From*): `+1 555 141 3769` (Test Number).
2. Debajo están dos identificadores. **Anota los dos:**
   - **Identificador del número de teléfono:** debe ser `1371708939369587`.
   - **Identificador de la cuenta de WhatsApp Business (WABA ID):** lo necesitas en el paso 4.
3. **Para** (*To*): tu número tiene que estar en la lista, confirmado con el código.
4. **Prueba de salida:** elige tu número en *Para* y pulsa **Enviar mensaje**. Te debe llegar **"Hello World"** desde el +1 555-141-3769.
   - Esto prueba que Meta puede escribirte. No prueba que te escuche: eso es el paso 4.
5. **Responde "hola" en ese mismo chat**, el que abrió "Hello World". Así te aseguras de escribir al número correcto.

✅ **Bien:** llega "Hello World".
❌ **No llega:** tu número no está confirmado en la lista → agrégalo otra vez.

## Paso 3 · Webhook y campo "messages" (3 min)
En **WhatsApp › Configuración** (*Configuration*), sección **Webhook**:
1. **URL de devolución de llamada:** exactamente `https://pacha-lilac.vercel.app/api/webhooks/whatsapp`, sin espacios ni barra al final.
2. **Token de verificación:** el `WHATSAPP_VERIFY_TOKEN` de tu `.env`. Si cambiaste algo, pulsa **Editar** › **Verificar y guardar**: tiene que guardar sin error.
3. **Campos del webhook** › **Administrar**: busca la fila **`messages`**:
   - el interruptor o la casilla **Suscrito** tiene que estar activado;
   - si se puede elegir una **versión** para el campo, usa la más reciente.
4. **Prueba de entrada simulada:** en la fila `messages` pulsa **Probar** (*Test*) › **Enviar al servidor**. Meta manda un mensaje de ejemplo a nuestra URL.
   - Ese ejemplo **no aparece en el bot** (usa un número ficticio), pero **sí aparece en los logs de Vercel** (paso 5) como `POST /api/webhooks/whatsapp`.

✅ **Bien:** `messages` está suscrito y la prueba aparece en los logs de Vercel con estado 200.
❌ **La prueba no aparece en Vercel:** la URL guardada es otra → corrígela y vuelve a verificar.

## Paso 4 · ¿La cuenta de WhatsApp Business tiene la app suscrita? ⭐ (5 min)
**Es el sospechoso número 1.** El paso 3 decide qué avisos quiere la app. Además, la **cuenta de WhatsApp Business** tiene que tener la app **suscrita** para mandárselos, y eso no siempre se ve en el panel. Si falta, el botón **Probar** del paso 3 funciona (es simulado), pero **los mensajes reales nunca salen**: exactamente lo que nos pasa.

**Opción A (recomendada): dale el WABA ID a Jhonatan o a Claude** y lo revisan y corrigen con el token del `.env`.

**Opción B: tú, con dos comandos.** Dentro de la carpeta `scratch` del repo, reemplaza `<WABA_ID>` por el ID anotado en el paso 2.

Revisar (solo lectura):
```
node --env-file=../.env -e "const t=process.env.WHATSAPP_TOKEN.trim();fetch('https://graph.facebook.com/v23.0/<WABA_ID>/subscribed_apps',{headers:{authorization:'Bearer '+t}}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))"
```
- `{"data":[]}` → **no hay ninguna app suscrita: esta es la causa.** Sigue con "Suscribir".
- `{"data":[{... "id":"2340026593488679" ...}]}` → la app ya está suscrita. Sigue con el paso 5.

Suscribir:
```
node --env-file=../.env -e "const t=process.env.WHATSAPP_TOKEN.trim();fetch('https://graph.facebook.com/v23.0/<WABA_ID>/subscribed_apps',{method:'POST',headers:{authorization:'Bearer '+t}}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))"
```
- Debe responder `{"success":true}`. Vuelve a correr "Revisar" para confirmar.
- Si dice *"permission"* o *"not authorized"*: el token (usuario del sistema) necesita la **cuenta de WhatsApp** asignada como activo con **control total**. Se asigna en Configuración del negocio › Usuarios del sistema › `pacha-bot` › Asignar activos.

✅ **Bien:** "Revisar" muestra la app 2340026593488679.

## Paso 5 · ¿Llegan las llamadas a Vercel? (3 min)
1. Entra a <https://vercel.com> › proyecto **pacha** › **Logs**.
2. Filtra por la ruta `/api/webhooks/whatsapp`, o escribe `whatsapp` en la búsqueda.
3. Manda **"hola"** al +1 555-141-3769 y mira qué aparece en los siguientes 30 segundos:

| Lo que aparece | Qué significa | Qué hacer |
|---|---|---|
| **Nada** | Meta no llama: falla el paso 3 o el 4 | Repasa los pasos 3 y 4 |
| `POST … 401` | Llega, pero la firma no coincide | `WHATSAPP_APP_SECRET` de Vercel ≠ el de Meta (Configuración de la app › Básica) → corrige y haz Redeploy |
| `POST … 200` y el bot no responde | Llega y se procesa, pero la respuesta falla | Busca en el log un error `WhatsApp …/messages` y pásaselo a Jhonatan (por ejemplo, 131030 = número fuera de la lista; 190 = token inválido) |
| `POST … 200` y el bot responde | ✅ Funciona | Listo |

## Paso 6 · Confirmación final desde el repo (2 min)
Dentro de la carpeta `scratch` del repo:
1. **Nuestro lado** (no manda mensajes reales):
   ```
   node --env-file=../.env verificar-whatsapp-prod.mjs
   ```
   Debe decir `OK: firma aceptada y Vercel usa el ID 1371708939369587`.
2. **Vigilar la base en vivo** mientras mandas "hola":
   ```
   node --env-file=../.env vigilar-whatsapp.mjs 5
   ```
   Debe decir `LLEGÓ al servidor` y `el bot lo procesó`.
3. En el teléfono debe aparecer la bienvenida de PACHA con **"Sí, quiero avisos"** / **"No, gracias"**.

---

## Paso 7 · Si nada de lo anterior funciona
- **Modo de la app:** arriba en el panel aparece **Desarrollo** o **En vivo**. Con el número de prueba suele funcionar en Desarrollo, pero si todo lo demás está bien, prueba pasarla a **En vivo**. Puede pedir una URL de política de privacidad; sirve `https://pacha-lilac.vercel.app`. *(No verificado con la documentación actual de Meta.)*
- **Esperar unos minutos:** a veces Meta tarda en activar una suscripción nueva.
- **Plan B del demo:** si el **domingo a las 11:45** WhatsApp sigue sin responder, el demo va por **Telegram** (@pacha_oruro_bot) y **`/probar`**. Los dos funcionan en producción y usan el mismo bot.
