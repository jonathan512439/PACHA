-- PACHA · migración v0.2 -> v0.3 (tarjetas) · sáb 21 nov 2026
-- Para proyectos que ya tienen el esquema v0.2. NO borra filas ni toca otras tablas.
-- En un proyecto nuevo no hace falta: schema.sql ya trae la versión v0.3 de `lessons`.
-- Se puede ejecutar más de una vez.
--
-- Cambios en `lessons`:
--   + step_sources jsonb (una fuente {doc, page} por paso)   + author text
--   + header_image_path (renombra image_path, conserva los datos) + step_image_paths text[] + card_image_path
--   - image_is_ai (todas las ilustraciones se declaran "generadas con IA" en el pie de la tarjeta)
--   regla: verificada/revisada exige verified_by (author = autor del texto o guía de origen; sin regla contra verified_by)

alter table lessons add column if not exists step_sources jsonb;
alter table lessons add column if not exists author text;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'lessons' and column_name = 'image_path') then
    alter table lessons rename column image_path to header_image_path;
  end if;
end $$;
alter table lessons add column if not exists header_image_path text;
alter table lessons add column if not exists step_image_paths text[] not null default '{}';
alter table lessons add column if not exists card_image_path text;
alter table lessons drop column if exists image_is_ai;

alter table lessons drop constraint if exists lessons_step_sources_check;
alter table lessons add constraint lessons_step_sources_check
  check (step_sources is null or (jsonb_typeof(step_sources) = 'array' and jsonb_array_length(step_sources) = 3));

alter table lessons drop constraint if exists lessons_step_image_paths_check;
alter table lessons add constraint lessons_step_image_paths_check check (cardinality(step_image_paths) <= 3);

-- La regla vieja ("verificada exige verified_by") se reemplaza por la nueva.
alter table lessons drop constraint if exists lessons_check;
alter table lessons drop constraint if exists lessons_verificada_check;
-- Filas viejas sin autor que no estén en borrador vuelven a borrador (deben re-verificarse con la regla nueva).
update lessons set status = 'borrador' where status <> 'borrador' and author is null;
alter table lessons add constraint lessons_verificada_check
  check (status = 'borrador' or verified_by is not null);

-- NOT NULL solo si no hay filas viejas sin estos datos (si las hay, el seed las completa y se vuelve a ejecutar).
do $$
begin
  if not exists (select 1 from lessons where step_sources is null) then
    alter table lessons alter column step_sources set not null;
  else
    raise notice 'lessons: hay filas sin step_sources; correr el seed y volver a ejecutar esta migración';
  end if;
  if not exists (select 1 from lessons where author is null) then
    alter table lessons alter column author set not null;
  else
    raise notice 'lessons: hay filas sin author; correr el seed y volver a ejecutar esta migración';
  end if;
end $$;
