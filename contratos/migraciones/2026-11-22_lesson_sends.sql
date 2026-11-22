-- PACHA · v0.3.1 · Envíos de tarjetas por problema desde el panel (dom 22/11)
-- Cuando varias comunidades reportan el mismo problema (factor), la técnica envía la tarjeta "durante"
-- de ese factor a sus suscriptores. Esta tabla registra quién envió qué y a qué comunidad, y permite
-- no repetir el envío a la misma comunidad por el mismo factor en 24 h.
-- Ejecutar UNA vez en el SQL Editor de Supabase. Es idempotente.

create table if not exists lesson_sends (
  id            uuid primary key default gen_random_uuid(),
  factor        text not null,
  lesson_id     text not null references lessons(id),
  community_id  uuid not null references communities(id) on delete cascade,
  recipients    integer not null default 0 check (recipients >= 0),   -- personas a las que se entregó
  sent_by       text not null,                                       -- usuario del panel
  sent_at       timestamptz not null default now()
);

create index if not exists lesson_sends_factor_comunidad on lesson_sends (factor, community_id, sent_at desc);

-- Igual que el resto: RLS activado y sin políticas; solo el servidor (service_role) accede.
alter table lesson_sends enable row level security;
grant select, insert, update, delete on lesson_sends to service_role;
