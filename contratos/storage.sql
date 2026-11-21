-- Emergencia Altiplano · buckets de Storage v0.2
-- Ejecutar DESPUÉS de schema.sql (SQL Editor -> Run). Se puede ejecutar más de una vez.
-- Las subidas las hace el servidor con la clave secreta (no necesita políticas).
-- Público = cualquiera con la URL puede leer el archivo (lo necesitan la web y los canales de mensajería).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  -- Audios pregenerados de tarjetas, bienvenida y alertas (OGG para WhatsApp/Telegram, MP3 para la web)
  ('audios',    'audios',    true,  5242880,  array['audio/ogg','audio/mpeg','audio/mp3']),
  -- Ilustraciones de tarjetas (decorativas)
  ('tarjetas',  'tarjetas',  true,  5242880,  array['image/png','image/jpeg','image/webp']),
  -- Fotos de entregas (sin personas, sin EXIF)
  ('entregas',  'entregas',  true,  5242880,  array['image/png','image/jpeg','image/webp']),
  -- PDF de los boletines del Senamhi (documentos públicos)
  ('boletines', 'boletines', true,  20971520, array['application/pdf']),
  -- Audios y fotos que manda la gente: DATO PERSONAL, privado
  ('reportes',  'reportes',  false, 16777216, null)
on conflict (id) do nothing;
