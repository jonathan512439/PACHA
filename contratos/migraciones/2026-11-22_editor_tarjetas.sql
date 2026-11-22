-- PACHA · editor de tarjetas y fuentes en el panel (opción 2) · dom 22 nov 2026
-- NO borra filas ni toca otras tablas. Se puede ejecutar más de una vez. La aplica Jhonatan (H7).
--
--   sources          fuentes registradas desde /panel/fuentes (se suman a data/fuentes.json)
--   lesson_versions  cada versión propuesta de una tarjeta: borrador → publicada | devuelta | descartada,
--                    y los retiros. La versión vigente sigue en `lessons` hasta que se publica la nueva.
-- Regla de dos personas: quien redacta una versión no puede verificarla (constraint en la base).

create table if not exists sources (
  id              text primary key check (id ~ '^[a-z0-9-]{3,80}$'),
  institucion     text not null,
  titulo          text not null,
  anio            int  not null check (anio between 1990 and 2100),
  url             text not null check (url ~ '^https://'),   -- sin enlace que se pueda abrir, no se registra
  claves          text[] not null check (cardinality(claves) >= 1),
  consultado      date not null,
  nota            text,
  reemplazada_por text,                                    -- id de la fuente que la reemplaza (si la hay)
  created_by      text not null,
  created_at      timestamptz not null default now()
);

create table if not exists lesson_versions (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    text not null
               check (lesson_id ~ '^(helada|sequia|nevada)-(antes_familia|antes_animales|durante|despues)-[0-9]{2}$'),
  contenido    jsonb not null,                             -- contenido de la Tarjeta (sin estado ni verificación)
  estado       text not null default 'borrador'
               check (estado in ('borrador', 'publicada', 'devuelta', 'descartada', 'retiro')),
  motivo       text not null,                              -- por qué se crea, se cambia o se retira
  huella       text not null,                              -- huellaVerificacion del contenido
  created_by   text not null,
  created_at   timestamptz not null default now(),
  verified_by  text,
  verified_at  timestamptz,
  observacion  text,                                       -- lo que anota quien verifica o devuelve
  constraint lesson_versions_dos_personas check (verified_by is null or verified_by <> created_by),
  constraint lesson_versions_publicada_check check (estado <> 'publicada' or verified_by is not null)
);
create index if not exists lesson_versions_lesson_idx on lesson_versions (lesson_id, created_at desc);
create index if not exists lesson_versions_estado_idx on lesson_versions (estado, created_at desc);

-- Igual que el resto de las tablas: sin acceso público; la app usa la clave de servicio en el servidor.
alter table sources         enable row level security;
alter table lesson_versions enable row level security;

-- Verificación:
select table_name from information_schema.tables
 where table_schema = 'public' and table_name in ('sources', 'lesson_versions')
 order by table_name;
