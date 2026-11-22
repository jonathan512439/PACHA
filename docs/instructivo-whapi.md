# WhatsApp por whapi.cloud (demo)

**Para:** el equipo que hace la demo · **Actualizado:** dom 22/11

La cuenta de Meta quedó bloqueada (error 131031). Para la demo, WhatsApp sale por **whapi.cloud** con un número nuevo. Telegram sigue siendo el canal por defecto.

whapi no es la API oficial de Meta: vincula el número como un dispositivo, igual que WhatsApp Web. Sirve para la demo; en producción va la Cloud API de Meta con la empresa verificada.

## Cómo se ve
- El bot responde desde el número nuevo.
- Las opciones llegan numeradas y se responde con el número (o con el texto de la opción).
- Lo demás es igual: menú, tarjetas con imagen y audio, reportes por voz, «mi reporte», alertas.

## Configuración (una vez, ~10 min)
1. Crear cuenta en **whapi.cloud** y crear un canal (prueba gratis).
2. En el canal, escanear el QR desde el teléfono con el número nuevo (WhatsApp › Dispositivos vinculados › Vincular).
3. Copiar el **token** del canal.
4. En el `.env` y en Vercel (Production):
   - `WHAPI_TOKEN=<token>`
   - `WHAPI_WEBHOOK_SECRET=<clave larga al azar>`
   - **Redeploy** en Vercel.
5. Registrar el webhook (lo hace Claude o cualquiera del equipo): `cd scratch && node --env-file=../.env configurar-whapi.mjs`. Deja el webhook en `https://pacha-lilac.vercel.app/api/webhooks/whapi` y activa la descarga automática de audios.
6. Desde **otro** teléfono, escribir «hola» al número nuevo.

Con `WHAPI_TOKEN`, **todo lo de WhatsApp sale por whapi** (también alertas y el «¿llegó?»). Para volver a Meta, borrarlo.

## Límites de la prueba gratis
- **5 chats distintos al mes** y 150 mensajes por día. Alcanza para el equipo y 1–2 jurados; el resto, por Telegram. El plan pago (USD 35/mes) no tiene límites.
- No escribirle al bot desde el mismo número vinculado: esos mensajes se ignoran.
- WhatsApp puede cerrar la sesión vinculada; se vuelve a escanear el QR.

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| No responde nada | Falta el redeploy, o el webhook no se registró (volver a correr el script) |
| Error 401 en los logs | El número se desvinculó: escanear el QR otra vez |
| Error 402 | Se acabó el límite de la prueba (5 chats) |
| Responde texto pero no entiende audios | La descarga del audio falló: revisar que el script activó `auto_download` |
