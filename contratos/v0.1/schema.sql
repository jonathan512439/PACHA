-- Emergencia Altiplano · esquema v0.1 (Postgres / Supabase)
-- Regla: las páginas públicas y el panel leen desde el SERVIDOR de Next con la
-- service role key. Nunca exponer esa clave al navegador. RLS queda activado
-- sin políticas, así que la clave anónima no ve nada.

create table stations (
  id         text primary key,                 -- ej. 'oruro-ciudad'
  name       text not null,
  department text not null default 'Oruro',
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
  created_at    timestamptz not null default now()
);

-- Dato personal: solo con opt-in. En el demo, únicamente números del equipo.
create table subscribers (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities(id),
  channel         text not null check (channel in ('whatsapp','telegram')),
  channel_user_id text not null,
  wants_voice     boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (channel, channel_user_id)
);

create table lessons (
  id          text primary key,                -- ej. 'helada-antes_animales-01'
  hazard      text not null check (hazard in ('helada','sequia','nevada')),
  phase       text not null check (phase in ('antes_familia','antes_animales','durante','despues')),
  title       text not null,
  steps       jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) = 3),
  factor_tags text[] not null default '{}',    -- valores de FACTORES (tipos.ts)
  source_doc  text not null,
  source_page text not null,
  source_url  text,
  reviewed_by text,
  status      text not null default 'borrador' check (status in ('borrador','revisada')),
  image_path  text,
  audio_path  text,
  created_at  timestamptz not null default now(),
  check (status <> 'revisada' or reviewed_by is not null)
);

create table bulletins (
  id           uuid primary key default gen_random_uuid(),
  station_id   text not null references stations(id),
  period_start date not null,
  period_end   date not null,
  pdf_path     text not null,
  is_example   boolean not null default true,  -- true = boletín histórico usado de ejemplo
  extracted    jsonb,                          -- salida validada de AvisoGemini
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table alerts (
  id            uuid primary key default gen_random_uuid(),
  bulletin_id   uuid not null references bulletins(id),
  station_id    text not null references stations(id),
  hazard        text not null check (hazard in ('helada','nevada','sequia')),
  senamhi_level text check (senamhi_level in ('amarillo','naranja','rojo')),
  min_temp_c    numeric(4,1),
  valid_from    date not null,
  valid_to      date not null,
  message_text  text not null,
  lesson_id     text references lessons(id),
  audio_path    text,
  status        text not null default 'borrador' check (status in ('borrador','aprobada','enviada','descartada')),
  approved_by   text,
  approved_at   timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  check (status not in ('aprobada','enviada') or approved_by is not null)
);

create table alert_deliveries (
  id            uuid primary key default gen_random_uuid(),
  alert_id      uuid not null references alerts(id),
  subscriber_id uuid not null references subscribers(id),
  channel       text not null check (channel in ('whatsapp','telegram')),
  status        text not null check (status in ('enviado','fallido')),
  error         text,
  sent_at       timestamptz not null default now()
);

create table reports (
  id             uuid primary key default gen_random_uuid(),
  community_id   uuid not null references communities(id),
  subscriber_id  uuid references subscribers(id),
  type           text not null check (type in ('agua','dano','forraje','otro')),
  payload        jsonb not null,               -- salida validada de ReporteGemini
  transcript     text,
  media_path     text,
  confidence     numeric(3,2) check (confidence between 0 and 1),
  factor         text,                         -- valor de FACTORES o null
  priority_score numeric(5,2),
  priority_breakdown jsonb,                    -- desglose visible en el panel
  status         text not null default 'por_confirmar'
                 check (status in ('por_confirmar','revisar','confirmado','atendido')),
  created_at     timestamptz not null default now()
);

create table deliveries (
  id                     uuid primary key default gen_random_uuid(),
  report_id              uuid references reports(id),
  community_id           uuid not null references communities(id),
  kind                   text not null check (kind in ('cisterna','forraje')),
  quantity               numeric not null check (quantity > 0),
  unit                   text not null check (unit in ('cisternas','kg')),
  photo_path             text,
  delivered_at           timestamptz not null default now(),
  confirmed_by_community boolean not null default false
);

create index on reports (community_id, status);
create index on alerts (status, created_at desc);
create index on deliveries (community_id, delivered_at desc);

alter table stations         enable row level security;
alter table communities      enable row level security;
alter table subscribers      enable row level security;
alter table lessons          enable row level security;
alter table bulletins        enable row level security;
alter table alerts           enable row level security;
alter table alert_deliveries enable row level security;
alter table reports          enable row level security;
alter table deliveries       enable row level security;
