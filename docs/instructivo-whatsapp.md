# Instructivo: conectar WhatsApp a PACHA

**Para:** Sergio (C) · **Tiempo:** unos 40 minutos · **Resultado:** el bot responde por WhatsApp a los 3 teléfonos del equipo.

> 🔒 **Regla de oro:** el *token*, el *App secret* y el *Verify token* son claves. **Nunca** van al chat del grupo, al repo ni a una captura de pantalla. Se cargan directo en Vercel, o se mandan por mensaje privado a Jhonatan.

---

## Antes de empezar
- [ ] Una cuenta de Facebook personal (con ella se entra a Meta for Developers).
- [ ] Los **3 números de WhatsApp del equipo** (A, B y C), en formato internacional: `+591 7xxxxxxx`.
- [ ] Los 3 teléfonos a mano: a cada uno le llegará un código por WhatsApp.
- [ ] **Saber si tienes acceso al proyecto `pacha` en Vercel** (equipo `pacha11`). Si no lo tienes, en el paso 5 le mandas los valores a Jhonatan por privado.

**URL de producción de la app:** `https://pacha-lilac.vercel.app`
⚠️ Usa **exactamente** esta. Las URLs del tipo `pacha-xxxx-pacha11.vercel.app` piden inicio de sesión de Vercel, y Meta no puede entrar.

---

## Paso 1 · Crear la app en Meta (10 min)
1. Entra a <https://developers.facebook.com> e inicia sesión con Facebook. Si es tu primera vez, acepta registrarte como desarrollador; te pedirá verificar tu número o tu correo.
2. Arriba a la derecha, entra a **Mis apps** y luego **Crear app**.
3. **Caso de uso:** elige el que menciona **WhatsApp** (por ejemplo, *"Conectarte con los clientes a través de WhatsApp"*). Siguiente.
4. **Nombre de la app:** `PACHA`. Correo: el tuyo.
5. **Portafolio comercial:** si te pide uno, crea uno nuevo con el nombre `PACHA`. **No hace falta verificar el negocio** para el número de prueba.
6. Pulsa **Crear app** y confirma tu contraseña de Facebook si te la pide.

✅ **Resultado:** estás en el panel de la app y en el menú izquierdo aparece **WhatsApp**.

## Paso 2 · Número de prueba y destinatarios (10 min)
1. Menú izquierdo: **WhatsApp** › **Configuración de la API** (*API Setup*).
2. En **"Desde"** (*From*) ya aparece un **número de prueba** que te da Meta. Debajo verás dos datos; anota estos dos:
   - **Identificador del número de teléfono** (*Phone number ID*): un número largo, por ejemplo `1234567890123456`. → será `WHATSAPP_PHONE_NUMBER_ID`.
   - **Token de acceso temporal** (*Temporary access token*): pulsa **Generar token** y cópialo. Empieza con `EAA…` y **dura 24 horas**. → será `WHATSAPP_TOKEN`. Para el demo se hace un token permanente en el paso 7.
3. En **"Para"** (*To*), elige **Administrar lista de números** y luego **Agregar número**. Agrega el primer teléfono del equipo en formato `+591…`.
4. A ese teléfono le llega un **código por WhatsApp**: escríbelo en Meta y confirma.
5. Repite con los otros 2 teléfonos. **El número de prueba admite 5 destinatarios como máximo**, así que usa solo 3 y deja 2 libres.

✅ **Resultado:** los 3 números aparecen en la lista de *To*. Si quieres, pulsa **Enviar mensaje** para mandar la plantilla `hello_world` a tu teléfono: debería llegarte "Hello World".

## Paso 3 · App secret (2 min)
1. Menú izquierdo: **Configuración de la app** › **Básica** (*App settings › Basic*).
2. En **Clave secreta de la app** (*App secret*), pulsa **Mostrar** y escribe tu contraseña.
3. Cópiala. → será `WHATSAPP_APP_SECRET`.

## Paso 4 · Inventar el Verify token (1 min)
Es una contraseña que **inventas tú** y que luego escribes dos veces: en Vercel (paso 5) y en Meta (paso 6). Tienen que ser **idénticas**.
- Si tienes Node instalado:
  `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`
- Si no, cualquier texto de **32 letras y números al azar**, sin espacios (por ejemplo, de un generador de contraseñas).
→ será `WHATSAPP_VERIFY_TOKEN`.

## Paso 5 · Cargar las 4 variables en Vercel (5 min)
**Si tienes acceso a Vercel:**
1. Entra a <https://vercel.com> › proyecto **pacha** › **Settings** › **Environment Variables**.
2. Agrega estas 4 variables, solo en el entorno **Production**:

   | Key | Valor | Sensitive |
   |---|---|---|
   | `WHATSAPP_TOKEN` | el token del paso 2 (`EAA…`) | ✅ |
   | `WHATSAPP_PHONE_NUMBER_ID` | el Phone number ID del paso 2 | — |
   | `WHATSAPP_APP_SECRET` | la clave del paso 3 | ✅ |
   | `WHATSAPP_VERIFY_TOKEN` | lo que inventaste en el paso 4 | ✅ |

3. **Muy importante:** las variables solo se aplican después de desplegar de nuevo. Ve a **Deployments**, abre el último deploy de **Production**, pulsa **⋯** y luego **Redeploy**. Espera a que diga **Ready** (1–2 min).

**Si no tienes acceso:** manda los 4 valores a Jhonatan **por mensaje privado** (nunca al grupo). Él los carga y hace el redeploy, y te avisa cuando esté listo.

> ⏸️ **Antes del paso 6, confirma con Jhonatan que el código del bot ya está desplegado en producción.**
> Para comprobarlo tú mismo, abre esta dirección en el navegador:
> `https://pacha-lilac.vercel.app/api/webhooks/whatsapp`
> - Si dice **"No autorizado"**: el código ya está. Sigue con el paso 6.
> - Si da **404 / página no encontrada**: todavía no está desplegado. Espera a Jhonatan.

## Paso 6 · Conectar el webhook (5 min)
1. En Meta, menú izquierdo: **WhatsApp** › **Configuración** (*Configuration*).
2. En la sección **Webhook**, pulsa **Editar**.
3. **URL de devolución de llamada** (*Callback URL*):
   `https://pacha-lilac.vercel.app/api/webhooks/whatsapp`
4. **Token de verificación** (*Verify token*): el mismo del paso 4, **idéntico** al de Vercel.
5. Pulsa **Verificar y guardar** (*Verify and save*).
   - ✅ Si se guarda sin error, la conexión está hecha.
   - ❌ Si falla, revisa la tabla de problemas al final.
6. Debajo, en **Campos del webhook** (*Webhook fields*), pulsa **Administrar** y **suscríbete a `messages`**. Es el único campo necesario.

## Paso 7 · Token permanente para el demo (10 min, recomendado)
El token del paso 2 **vence a las 24 h**: si vence durante el demo, el bot deja de responder. Hay dos salidas:

**Opción A (recomendada): token permanente con un usuario del sistema**
1. Entra a <https://business.facebook.com/settings> (Configuración del negocio) y elige el portafolio `PACHA`.
2. **Usuarios** › **Usuarios del sistema** › **Agregar**. Nombre: `pacha-bot`. Rol: **Administrador**.
3. Selecciona `pacha-bot` › **Asignar activos**:
   - **Apps** › `PACHA` › control total;
   - **Cuentas de WhatsApp** › la cuenta de WhatsApp de la app › control total.
4. **Generar nuevo token** › app `PACHA` › vencimiento **"Nunca"** › permisos **`whatsapp_business_messaging`** y **`whatsapp_business_management`** › **Generar**.
5. Copia el token y **reemplaza** el valor de `WHATSAPP_TOKEN` en Vercel (o mándaselo a Jhonatan). Después, **Redeploy**.

**Opción B:** regenerar el token temporal el domingo antes de las 12:00 y el día del demo 30 minutos antes; cada vez hay que actualizarlo en Vercel y hacer redeploy.

## Paso 8 · Probar (5 min)
1. Desde **uno de los 3 teléfonos registrados**, abre WhatsApp y escríbele **"hola"** al **número de prueba** (el que aparece en *From* del paso 2).
2. ✅ En unos segundos responde el bot: *"Hola 👋 Soy PACHA…"*, con los botones **Sí, quiero avisos** / **No, gracias**.
3. Pulsa **Sí**, elige una comunidad, escribe **0** para ver el menú y prueba un audio corto: *"Hace seis días que no hay agua, somos cuarenta familias"*.
4. Avisa en el grupo **"WhatsApp OK"**. Solo eso: sin capturas que muestren claves.

---

## Si algo falla
| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "Verificar y guardar" da error | El código no está desplegado o falta el redeploy | Abre `https://pacha-lilac.vercel.app/api/webhooks/whatsapp`: tiene que decir "No autorizado". Si da 404, espera a Jhonatan |
| "Verificar y guardar" da error y la URL dice "No autorizado" | El *Verify token* de Meta no coincide con el de Vercel, o no hubo redeploy | Copia el mismo valor en los dos lados y haz **Redeploy** |
| "Verificar y guardar" da error con otra URL | Usaste una URL `pacha-xxxx-pacha11.vercel.app` | Usa **`https://pacha-lilac.vercel.app/...`** |
| Escribo "hola" y no responde nada | No te suscribiste a `messages` (paso 6.6) | Suscríbete a **messages** |
| Sigue sin responder | El *App secret* está mal: Meta envía el mensaje pero el servidor lo rechaza | Copia de nuevo el App secret (paso 3) en Vercel y haz **Redeploy** |
| Meta entrega los mensajes pero el bot no responde a nadie | En `WHATSAPP_PHONE_NUMBER_ID` se puso el **ID de la cuenta de WhatsApp Business** en vez del **ID del número** (en la misma pantalla hay dos números largos parecidos; pasó el sáb 21/11) | Usa el *Identificador del número de teléfono* que aparece junto a "De". Edita la variable en **Production** (sin comillas) y haz **Redeploy**. Para comprobarlo sin mandar mensajes reales: `node --env-file=../.env verificar-whatsapp-prod.mjs` dentro de `scratch/` |
| Responde a un teléfono y a otro no | Ese número no está en la lista de destinatarios (error **131030**) | Agrégalo en *To* (paso 2.3) y confirma el código |
| Funcionaba y dejó de responder | El token temporal venció (error **190**) | Haz el paso 7 |
| El audio del bot llega con ícono de música | Es normal en esta versión | Se reproduce igual |

**Dónde ver los errores:** Vercel › proyecto **pacha** › **Logs**, filtrando por `/api/webhooks/whatsapp`. Copia el mensaje de error, **no el token**, y pásaselo a Jhonatan.

## Para el día del demo
- [ ] El token es permanente (paso 7), o lo regeneraste en los últimos 30 minutos.
- [ ] **5 minutos antes**, los 3 teléfonos le escriben **"ALERTA"** al número de prueba. Así se abre la **ventana de 24 horas** de WhatsApp, y el bot puede mandar la alerta y los audios sin plantilla aprobada.
- [ ] El jurado **no** usa WhatsApp (solo hay 5 destinatarios). Usa el **QR de Telegram** y **`/probar`**.
