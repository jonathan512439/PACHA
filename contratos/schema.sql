-- PACHA · esquema v0.3 (Postgres / Supabase) · sáb 21 nov 2026 (v0.3 = tarjetas; migración en contratos/migraciones/)
-- Cambios respecto a v0.1: ver contratos/CONTRATOS.md (sección "Cambios v0.2").
--
-- Reglas:
-- * Las páginas públicas y el panel leen desde el SERVIDOR de Next con la clave secreta
--   (service_role / sb_secret_...). Nunca exponer esa clave al navegador ni usar NEXT_PUBLIC_.
-- * RLS activado y SIN políticas: la clave pública (anon / publishable) no ve nada.
-- * Ejecutar este archivo una sola vez en un proyecto vacío (SQL Editor -> Run).
--   Para rehacer desde cero: borrar las tablas en orden inverso o crear un proyecto nuevo.

-- ---------------------------------------------------------------------------
-- Referencia
-- ---------------------------------------------------------------------------
create table stations (
  id         text primary key,                 -- ej. 'oruro-ciudad'
  name       text not null,
  department text not null default 'Oruro',
  zona       text,                             -- zona del boletín, ej. 'Altiplano Central'
  lat        double precision,
  lon        double precision
);

create table communities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  municipio     text not null,
  lat           double precision not null,
  lon           double precision not null,
  families      int  not null check (families >= 0),
  animals       int  not null default 0 check (animals >= 0),
  main_activity text not null check (main_activity in ('camelidos','papa_quinua','mixto')),
  station_id    text references stations(id),
  is_example    boolean not null default true,  -- true = comunidad ficticia de demo
  is_test       boolean not null default false, -- true = "Comunidad de prueba (EJEMPLO)" del jurado
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Personas suscritas (dato personal: solo con opt-in; en el demo, solo el equipo)
-- ---------------------------------------------------------------------------
create table subscribers (
  id               uuid primary key default gen_random_uuid(),
  community_id     uuid references communities(id),          -- null mientras se registra
  channel          text not null check (channel in ('whatsapp','telegram','web')),
  channel_user_id  text not null,                            -- teléfono, chat_id o id de cookie (web)
  estado           text not null default 'nuevo',            -- paso de la conversación (máquina de estados)
  contexto         jsonb not null default '{}'::jsonb,       -- datos del paso: reporte pendiente, opción de menú...
  activo           boolean not null default true,            -- false tras BAJA
  wants_voice      boolean not null default true,
  last_inbound_at  timestamptz,                              -- para saber si la ventana de 24 h de WhatsApp está abierta
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (channel, channel_user_id)
);

-- Deduplicación de mensajes entrantes (WhatsApp y Telegram reintentan) y conteo del tope diario de IA.
create table inbound_messages (
  channel     text not null check (channel in ('whatsapp','telegram','web')),
  message_id  text not null,
  uses_ai     boolean not null default false,  -- true si el mensaje gastó una llamada a Gemini
  received_at timestamptz not null default now(),
  primary key (channel, message_id)
);

-- ---------------------------------------------------------------------------
-- Tarjetas "qué hacer" (las escribe el equipo a partir de fuentes; la IA solo elige ids)
-- ---------------------------------------------------------------------------
create table lessons (
  id             text primary key
                 check (id ~ '^(helada|sequia|nevada)-(antes_familia|antes_animales|durante|despues)-[0-9]{2}$'),
  hazard         text not null check (hazard in ('helada','sequia','nevada')),
  phase          text not null check (phase in ('antes_familia','antes_animales','durante','despues')),
  title          text not null,
  steps          jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) = 3),
  -- v0.3: una fuente {doc, page} por paso, en el mismo orden que steps
  step_sources   jsonb not null check (jsonb_typeof(step_sources) = 'array' and jsonb_array_length(step_sources) = 3),
  factor_tags    text[] not null default '{}',   -- valores de FACTORES (tipos.ts)
  source_doc     text not null,                  -- institución y documento: la autoría que se muestra
  source_page    text not null,                  -- número del VISOR de PDF (para source_url#page=N)
  source_url     text,
  author         text not null,                  -- autor del texto o guía de origen (la autoría que se menciona)
  status         text not null default 'borrador' check (status in ('borrador','verificada','revisada')),
  verified_by    text,                           -- persona del equipo que comprobó cada paso en la página citada
  reviewed_by    text,                           -- técnico que la revisó
  header_image_path text,                        -- bucket 'tarjetas': lessons/<id>/header.jpg|webp
  step_image_paths  text[] not null default '{}' check (cardinality(step_image_paths) <= 3), -- lessons/<id>/paso1..3.webp
  card_image_path   text,                        -- PNG 1080×1350 exportado con Playwright (bucket 'tarjetas')
  audio_ogg_path text,                           -- OGG/Opus mono 32k (WhatsApp/Telegram), bucket 'audios'
  audio_mp3_path text,                           -- MP3 64k (web), bucket 'audios'
  created_at     timestamptz not null default now(),
  constraint lessons_verificada_check check (status = 'borrador' or verified_by is not null),
  check (status <> 'revisada'   or reviewed_by is not null)
);

-- ---------------------------------------------------------------------------
-- Boletines del Senamhi y alertas
-- ---------------------------------------------------------------------------
create table bulletins (
  id           uuid primary key default gen_random_uuid(),
  region       text not null default 'altiplano',
  source_url   text unique,                      -- null si se subió a mano
  pdf_path     text not null,                    -- ruta en Storage (bucket 'boletines')
  period_start date,                             -- se completa al procesar
  period_end   date,
  status       text not null default 'descargado' check (status in ('descargado','procesado','error')),
  error        text,
  is_example   boolean not null default false,   -- true = boletín histórico usado de ejemplo
  extracted    jsonb,                            -- salida validada de AvisoGemini
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table alerts (
  id              uuid primary key default gen_random_uuid(),
  bulletin_id     uuid not null references bulletins(id),
  station_id      text not null references stations(id),
  zona            text,
  hazard          text not null check (hazard in ('helada','nevada','sequia')),
  risk_level      text check (risk_level in ('bajo','medio','alto')),
  senamhi_level   text check (senamhi_level in ('amarillo','naranja','rojo')),
  min_temp_c      numeric(4,1),
  cita_evento     text not null,                 -- literal del boletín; sin cita no hay alerta
  cita_riesgo     text,
  decision_reason text not null,                 -- motivo de debeAlertar, visible en la vista previa
  valid_from      date not null,
  valid_to        date not null,
  message_text    text not null,                 -- armado por plantilla (código), nunca por IA
  lesson_id       text references lessons(id),   -- asignada por regla (amenaza + fase antes_*)
  audio_ogg_path  text,                          -- audio pregenerado, adjuntado por regla
  audio_mp3_path  text,
  status          text not null default 'borrador' check (status in ('borrador','aprobada','enviada','descartada')),
  approved_by     text,
  approved_at     timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  check (status not in ('aprobada','enviada') or approved_by is not null)
);

create table alert_deliveries (
  id            uuid primary key default gen_random_uuid(),
  alert_id      uuid not null references alerts(id),
  subscriber_id uuid not null references subscribers(id),
  channel       text not null check (channel in ('whatsapp','telegram','web')),
  status        text not null check (status in ('enviado','fallido')),
  error         text,
  sent_at       timestamptz not null default now(),
  unique (alert_id, subscriber_id)
);

-- ---------------------------------------------------------------------------
-- Reportes comunitarios, prioridad y entregas
-- ---------------------------------------------------------------------------
create table reports (
  id                 uuid primary key default gen_random_uuid(),
  community_id       uuid not null references communities(id),
  subscriber_id      uuid references subscribers(id),
  type               text not null check (type in ('agua','dano','forraje','otro')),
  payload            jsonb not null,           -- salida validada de MensajeEntrante.reporte
  transcript         text,
  media_path         text,                     -- audio original (bucket privado 'reportes')
  confidence         numeric(3,2) check (confidence between 0 and 1),
  factor             text,                     -- valor de FACTORES o null
  priority_score     numeric(5,2),             -- calculado al confirmar (la espera se recalcula al leer)
  priority_breakdown jsonb,
  status             text not null default 'por_confirmar'
                     check (status in ('por_confirmar','confirmado','atendido','revisar','descartado')),
  confirmed_at       timestamptz,
  attended_at        timestamptz,
  updated_by         text,                     -- usuario del panel que lo corrigió, confirmó o descartó
  created_at         timestamptz not null default now()
);

create table deliveries (
  id                     uuid primary key default gen_random_uuid(),
  report_id              uuid references reports(id),
  community_id           uuid not null references communities(id),
  kind                   text not null check (kind in ('cisterna','forraje')),
  quantity               numeric not null check (quantity > 0),
  unit                   text not null check (unit in ('cisternas','kg')),
  photo_path             text,                 -- bucket público 'entregas' (sin personas, sin EXIF)
  is_example             boolean not null default false,
  registered_by          text,                 -- usuario del panel
  delivered_at           timestamptz not null default now(),
  confirmed_by_community boolean,              -- null = sin respuesta · true = llegó · false = no llegó
  confirmed_at           timestamptz
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index on reports (community_id, status);
create index on alerts (status, created_at desc);
create index on deliveries (community_id, delivered_at desc);
create index on subscribers (community_id) where activo;
create index on inbound_messages (received_at) where uses_ai;

-- ---------------------------------------------------------------------------
-- RLS: activado y sin políticas (solo el servidor con la clave secreta accede)
-- ---------------------------------------------------------------------------
alter table stations         enable row level security;
alter table communities      enable row level security;
alter table subscribers      enable row level security;
alter table inbound_messages enable row level security;
alter table lessons          enable row level security;
alter table bulletins        enable row level security;
alter table alerts           enable row level security;
alter table alert_deliveries enable row level security;
alter table reports          enable row level security;
alter table deliveries       enable row level security;

-- ---------------------------------------------------------------------------
-- Permisos: SOLO service_role (el servidor) lee y escribe. anon/authenticated no reciben permisos de datos.
-- Necesario en proyectos creados sin "exponer automáticamente las tablas nuevas" (sin esto: permission denied).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

-- ---------------------------------------------------------------------------
-- Datos de referencia (reales, no de demo). Coordenadas aproximadas.
-- ---------------------------------------------------------------------------
insert into stations (id, name, department, zona, lat, lon) values
  ('oruro-ciudad',     'Oruro-Ciudad',     'Oruro', 'Altiplano Central', -17.97, -67.11),
  ('oruro-aeropuerto', 'Oruro-Aeropuerto', 'Oruro', 'Altiplano Central', -17.96, -67.08);
