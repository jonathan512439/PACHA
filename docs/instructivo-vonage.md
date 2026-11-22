# WhatsApp por el sandbox de Vonage (demo)

**Para:** el equipo que hace la demo · **Actualizado:** dom 22/11

La cuenta de Meta quedó bloqueada (error 131031). Para la demo, WhatsApp sale por el **sandbox de Vonage**: gratis y sin documentos. Telegram sigue siendo el canal por defecto.

## Cómo se ve
- El bot responde desde el número del sandbox de Vonage (+1 415 738 6102).
- No hay botones: las opciones llegan numeradas y se responde con el número (o con el texto de la opción).
- Lo demás es igual: menú, tarjetas con imagen y audio, reportes por voz, «mi reporte», alertas.

## Configuración (una vez, ~10 min)
1. Crear cuenta en **dashboard.nexmo.com** (Vonage API).
2. En la portada del dashboard copiar **API key** y **API secret**.
3. Ir a **dashboard.nexmo.com/messages/sandbox** › WhatsApp › **Add to sandbox**. Unir tu teléfono enviando la frase indicada (o escaneando el QR) al +1 415 738 6102.
4. Inventar una clave larga al azar para el webhook (por ejemplo, 32 letras y números).
5. En la misma página del sandbox, **Webhooks**:
   - Inbound: `https://pacha-lilac.vercel.app/api/webhooks/vonage?k=<clave>`
   - Status: la misma URL.
   - **Save webhooks**.
6. En el `.env` y en Vercel (Production):
   - `VONAGE_API_KEY`, `VONAGE_API_SECRET`
   - `VONAGE_WHATSAPP_FROM=14157386102`
   - `VONAGE_WEBHOOK_SECRET=<clave>`
   - **Redeploy** para que tome las variables.
7. Escribir «hola» al número del sandbox.

Con las tres primeras variables, **todo lo de WhatsApp sale por Vonage** (también alertas y el «¿llegó?»). Para volver a Meta, borrarlas.

## Límites del sandbox
- **~100 mensajes al mes** en total. Una persona gasta 8–10 (una tarjeta son 2: imagen con texto y audio). Alcanza para unas 10 personas: no gastarlo en pruebas largas.
- **1 mensaje por segundo:** el bot espera 1 s entre mensajes, por eso las respuestas tardan un poco.
- **Ventana de 24 h, sin plantillas:** las alertas solo llegan a quien escribió en las últimas 24 h.
- Cada teléfono debe unirse al sandbox con la frase antes de escribir.

## Para el jurado
QR con `https://wa.me/14157386102?text=<frase del sandbox>`. Envían la frase y luego «hola». Mejor 2–3 jurados por el tope mensual; para el resto, Telegram.

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| No responde nada | Webhook mal escrito o falta `?k=<clave>`; variables sin redeploy |
| Error 401 en los envíos (logs de Vercel) | API key o secret mal copiados |
| Error 429 | Se pasó el tope mensual o más de 1 mensaje por segundo |
| Responde texto pero no el audio de un reporte | La descarga del audio de Vonage falló: revisar logs |
