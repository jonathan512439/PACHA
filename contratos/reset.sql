-- PACHA · BORRA TODAS LAS TABLAS DEL ESQUEMA v0.2 (y sus datos).
-- Solo para un proyecto de demo cuando schema.sql quedó a medias. NO toca los buckets de Storage.
-- Después de ejecutarlo: volver a ejecutar schema.sql completo.
drop table if exists lesson_sends     cascade;
drop table if exists deliveries       cascade;
drop table if exists reports          cascade;
drop table if exists alert_deliveries cascade;
drop table if exists alerts           cascade;
drop table if exists bulletins        cascade;
drop table if exists lessons          cascade;
drop table if exists inbound_messages cascade;
drop table if exists subscribers      cascade;
drop table if exists communities      cascade;
drop table if exists stations         cascade;
