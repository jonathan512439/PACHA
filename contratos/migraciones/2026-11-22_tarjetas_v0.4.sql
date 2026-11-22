-- PACHA · migración v0.3 -> v0.4 (tarjetas) · dom 22 nov 2026
-- Para el proyecto que ya tiene `lessons` v0.3. NO borra filas ni toca otras tablas.
-- Se puede ejecutar más de una vez. La aplica Jhonatan en Supabase › SQL Editor (entrega H7).
--
-- Cambios en `lessons` (todo compatible con las 6 tarjetas actuales):
--   + por_que     jsonb  {texto, fuente:{doc,page}}            "Por qué importa" (1 o 2 frases)
--   + evitar      jsonb  [{texto, fuente:{doc,page}}] (0 a 2)  "Evita" (solo si la fuente lo dice)
--   + pedir_ayuda jsonb  {texto, fuente:{doc,page}|null}       "Pide ayuda si…"
--   steps y step_sources: de exactamente 3 a entre 3 y 5 (y del mismo largo)
--   step_image_paths: hasta 5
--
-- Antes de aplicarla, la app ya funciona: lee con select("*") y el seed solo envía estas columnas
-- si alguna tarjeta las trae.

-- 1) Quitar TODA regla CHECK vieja sobre steps, step_sources o step_image_paths, se llame como se llame
--    (en schema.sql eran checks anónimos: si Postgres les dio otro nombre, "exactamente 3" seguiría vivo
--    y bloquearía las tarjetas de 4–5 pasos). Se recrean más abajo. Idempotente.
do $$
declare
  r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.lessons'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ~ '(steps|step_sources|step_image_paths)'
  loop
    execute format('alter table public.lessons drop constraint if exists %I', r.conname);
    raise notice 'lessons: se quitó la regla %', r.conname;
  end loop;
end $$;

-- 2) Columnas nuevas
alter table lessons add column if not exists por_que jsonb;
alter table lessons add column if not exists evitar jsonb;
alter table lessons add column if not exists pedir_ayuda jsonb;

alter table lessons drop constraint if exists lessons_por_que_check;
alter table lessons add constraint lessons_por_que_check
  check (por_que is null or (jsonb_typeof(por_que) = 'object' and por_que ? 'texto' and por_que ? 'fuente'));

alter table lessons drop constraint if exists lessons_evitar_check;
alter table lessons add constraint lessons_evitar_check
  check (evitar is null or (jsonb_typeof(evitar) = 'array' and jsonb_array_length(evitar) <= 2));

alter table lessons drop constraint if exists lessons_pedir_ayuda_check;
alter table lessons add constraint lessons_pedir_ayuda_check
  check (pedir_ayuda is null or (jsonb_typeof(pedir_ayuda) = 'object' and pedir_ayuda ? 'texto'));

-- Pasos: de 3 a 5. En schema.sql el check de steps era anónimo (Postgres lo nombra lessons_steps_check).
alter table lessons drop constraint if exists lessons_steps_check;
alter table lessons add constraint lessons_steps_check
  check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 3 and 5);

alter table lessons drop constraint if exists lessons_step_sources_check;
alter table lessons add constraint lessons_step_sources_check
  check (step_sources is null or (jsonb_typeof(step_sources) = 'array' and jsonb_array_length(step_sources) between 3 and 5));

alter table lessons drop constraint if exists lessons_step_sources_largo_check;
alter table lessons add constraint lessons_step_sources_largo_check
  check (step_sources is null or jsonb_array_length(step_sources) = jsonb_array_length(steps));

alter table lessons drop constraint if exists lessons_step_image_paths_check;
alter table lessons add constraint lessons_step_image_paths_check check (cardinality(step_image_paths) <= 5);

-- 3) Verificación: debe listar las 3 columnas nuevas…
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'lessons' and column_name in ('por_que', 'evitar', 'pedir_ayuda')
 order by column_name;

-- …y los CHECK de lessons. Sobre steps/step_sources solo deben quedar las reglas "between 3 and 5"
-- (lessons_steps_check, lessons_step_sources_check, lessons_step_sources_largo_check) y lessons_step_image_paths_check "<= 5".
select conname, pg_get_constraintdef(oid) as regla
  from pg_constraint
 where conrelid = 'public.lessons'::regclass and contype = 'c'
 order by conname;
