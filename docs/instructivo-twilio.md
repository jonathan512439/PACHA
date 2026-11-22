# WhatsApp por Twilio (sandbox) para la demo

**Para:** el equipo que hace la demo · **Actualizado:** dom 22/11

La cuenta de Meta quedó bloqueada (error 131031) y la apelación pide documentos de la empresa. Para la demo, WhatsApp sale por el **sandbox de Twilio**: no pide documentos y cualquiera se une escaneando un QR. Telegram sigue siendo el canal por defecto.

## Cómo se ve
- El bot responde desde el número del sandbox de Twilio (+1 415 523 8886), no desde un número propio.
- No hay botones: las opciones llegan numeradas y se responde con el número (o con el texto de la opción).
- Todo lo demás es igual: menú, tarjetas con imagen y audio, reportes por voz, «mi reporte», alertas.

## Configuración (una vez, ~10 min)
1. Crear cuenta en twilio.com (la de prueba es gratis).
2. Consola › **Messaging › Try it out › Send a WhatsApp message**. Ahí aparece la palabra del sandbox (`join xxx-yyy`). Unir tu teléfono enviando ese mensaje al +1 415 523 8886.
3. En **Sandbox settings**, «When a message comes in»: `https://pacha-lilac.vercel.app/api/webhooks/twilio`, método **POST**. Guardar.
4. En el `.env` y en Vercel (Production):
   - `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` (en la portada de la consola de Twilio).
   - `TWILIO_WHATSAPP_FROM=+14155238886`.
   - Redeploy en Vercel para que tome las variables.
5. Escribir «hola» al número del sandbox.

Con las tres variables, **todo lo de WhatsApp sale por Twilio** (también alertas y el «¿llegó?»). Para volver a Meta, borrar las variables.

## Para el jurado
- QR en una diapositiva con el enlace `https://wa.me/14155238886?text=join%20xxx-yyy` (cambiar por la palabra del sandbox).
- Al escanearlo, envían el mensaje, Twilio confirma, y escriben «hola».

## Límites
- **Cuenta de prueba:** unos 50 mensajes por día. Cada persona gasta 8–10 (una tarjeta son 2: imagen con texto y audio). Alcanza para probar y 3–4 personas. Para todo el jurado, recargar USD 20 en Twilio quita el tope.
- **Ventana de 24 h:** las alertas solo llegan a quien escribió al bot en las últimas 24 h.
- La unión al sandbox vence a los pocos días; se vuelve a enviar el `join`.

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| Twilio no llama al webhook o da 403 | URL mal puesta, o la firma no coincide: poner `TWILIO_WEBHOOK_URL` con la URL exacta de Twilio |
| Error 63015 en los logs | Esa persona no envió el `join` |
| Error 63016 | Pasaron más de 24 h desde su último mensaje |
| Se corta a mitad del día | Se acabó el tope de la cuenta de prueba |
