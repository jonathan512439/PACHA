# Audio de las tarjetas: conversión y subida

El audio **no** se genera en el servidor (sin ffmpeg en Vercel). C lo graba o lo genera en su portátil con el texto de `data/tarjetas/guiones_audio.json` y lo convierte con estos comandos.

## 1. Convertir (un par de archivos por tarjeta)

Desde la raíz del repo, con la grabación en `entrada.wav` (o .m4a, .webm, .ogg…):

```sh
# WhatsApp / Telegram: OGG Opus mono 32 kbps
ffmpeg -i entrada.wav -c:a libopus -ac 1 -b:a 32k assets/audio/<id>.ogg

# Web: MP3 64 kbps
ffmpeg -i entrada.wav -b:a 64k assets/audio/<id>.mp3
```

Si Gemini TTS entrega PCM crudo (sin cabecera), anteponer el formato de entrada:

```sh
ffmpeg -f s16le -ar 24000 -ac 1 -i entrada.pcm -c:a libopus -ac 1 -b:a 32k assets/audio/<id>.ogg
ffmpeg -f s16le -ar 24000 -ac 1 -i entrada.pcm -b:a 64k assets/audio/<id>.mp3
```

Ejemplo para la tarjeta del demo:

```sh
ffmpeg -i sequia-durante.wav -c:a libopus -ac 1 -b:a 32k assets/audio/sequia-durante-01.ogg
ffmpeg -i sequia-durante.wav -b:a 64k assets/audio/sequia-durante-01.mp3
```

Ids válidos: `helada-antes_familia-01`, `helada-antes_animales-01`, `helada-durante-01`, `sequia-antes_familia-01`, `sequia-antes_animales-01`, `sequia-durante-01`.

## 2. Revisar antes de subir
- Escucharlo completo: que coincida con el texto de la tarjeta y que los números se digan bien.
- Duración esperada: 30 s o menos (`ffprobe -hide_banner assets/audio/<id>.ogg`).

## 3. Subir

```sh
npx tsx scripts/subir-audios.ts
```

Sube a Storage (bucket `audios`, `lessons/<id>.ogg|.mp3`) lo que haya en `assets/audio/` y rellena `audio_ogg_path` / `audio_mp3_path`. Una tarjeta sin audio no es un error: el bot envía imagen y texto.

Los audios **no** van a git (`assets/audio/*` está en `.gitignore`).
