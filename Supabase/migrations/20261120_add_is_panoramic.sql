-- Migración para bases de datos creadas antes de la opción "Hacer panorámica".
-- Ejecutar una sola vez en el proyecto remoto de Supabase.
alter table public.monzu_artworks
  add column if not exists is_panoramic boolean not null default false;
