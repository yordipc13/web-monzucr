-- Revisar antes de ejecutar en el proyecto remoto. No contiene usuarios ni categorías.
create table public.monzu_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.monzu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0)
);

create table public.monzu_artworks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  category_id uuid references public.monzu_categories(id),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or category_id is not null)
);

create table public.monzu_images (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.monzu_artworks(id) on delete cascade,
  position integer not null check (position >= 0),
  storage_path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  alt text not null default '',
  unique (artwork_id, position)
);

create table public.monzu_featured (
  slot integer not null check (slot in (1, 2)),
  artwork_id uuid not null references public.monzu_artworks(id) on delete cascade,
  position integer not null check (position >= 0),
  primary key (slot, artwork_id),
  unique (slot, position)
);

create index monzu_artworks_published_order on public.monzu_artworks (created_at desc, id desc) where status = 'published';
create index monzu_images_artwork_order on public.monzu_images (artwork_id, position);

create function public.monzu_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.monzu_admins where user_id = auth.uid());
$$;
revoke all on function public.monzu_is_admin() from public;
grant execute on function public.monzu_is_admin() to anon, authenticated;

create function public.monzu_check_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and not exists (
    select 1 from public.monzu_images where artwork_id = new.id
  ) then
    raise exception 'Una obra publicada necesita al menos una imagen';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger monzu_check_publication before insert or update on public.monzu_artworks
for each row execute function public.monzu_check_publication();

create function public.monzu_preserve_published_image()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.monzu_artworks where id = old.artwork_id and status = 'published')
    and (select count(*) from public.monzu_images where artwork_id = old.artwork_id) <= 1 then
    raise exception 'No se puede retirar la última imagen de una obra publicada';
  end if;
  return old;
end;
$$;
create trigger monzu_preserve_published_image before delete on public.monzu_images
for each row execute function public.monzu_preserve_published_image();

create function public.monzu_reorder_images(p_artwork_id uuid, p_image_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  image_count integer;
begin
  if not public.monzu_is_admin() then
    raise exception 'No autorizado';
  end if;
  select count(*) into image_count from public.monzu_images where artwork_id = p_artwork_id;
  if cardinality(p_image_ids) <> image_count
    or (select count(distinct value) from unnest(p_image_ids) as value) <> image_count
    or exists (
      select 1 from unnest(p_image_ids) as value
      where not exists (select 1 from public.monzu_images where id = value and artwork_id = p_artwork_id)
    ) then
    raise exception 'La lista de imágenes no coincide con la obra';
  end if;
  update public.monzu_images
    set position = position + coalesce((select max(position) + 1 from public.monzu_images where artwork_id = p_artwork_id), 0)
    where artwork_id = p_artwork_id;
  update public.monzu_images
    set position = array_position(p_image_ids, id) - 1
    where artwork_id = p_artwork_id;
end;
$$;
revoke all on function public.monzu_reorder_images(uuid, uuid[]) from public;
grant execute on function public.monzu_reorder_images(uuid, uuid[]) to authenticated;

alter table public.monzu_admins enable row level security;
alter table public.monzu_categories enable row level security;
alter table public.monzu_artworks enable row level security;
alter table public.monzu_images enable row level security;
alter table public.monzu_featured enable row level security;

grant select on public.monzu_categories, public.monzu_artworks, public.monzu_images, public.monzu_featured to anon, authenticated;
grant select on public.monzu_admins to authenticated;
grant insert, update, delete on public.monzu_categories, public.monzu_artworks, public.monzu_images, public.monzu_featured to authenticated;

create policy monzu_admins_read_self on public.monzu_admins for select to authenticated using (user_id = auth.uid());
create policy monzu_categories_read on public.monzu_categories for select to anon, authenticated using (true);
create policy monzu_categories_admin on public.monzu_categories for all to authenticated using (public.monzu_is_admin()) with check (public.monzu_is_admin());
create policy monzu_artworks_read on public.monzu_artworks for select to anon, authenticated using (status = 'published' or public.monzu_is_admin());
create policy monzu_artworks_admin on public.monzu_artworks for all to authenticated using (public.monzu_is_admin()) with check (public.monzu_is_admin());
create policy monzu_images_read on public.monzu_images for select to anon, authenticated using (
  public.monzu_is_admin() or exists (select 1 from public.monzu_artworks where id = artwork_id and status = 'published')
);
create policy monzu_images_admin on public.monzu_images for all to authenticated using (public.monzu_is_admin()) with check (public.monzu_is_admin());
create policy monzu_featured_read on public.monzu_featured for select to anon, authenticated using (
  public.monzu_is_admin() or exists (select 1 from public.monzu_artworks where id = artwork_id and status = 'published')
);
create policy monzu_featured_admin on public.monzu_featured for all to authenticated using (public.monzu_is_admin()) with check (public.monzu_is_admin());

insert into storage.buckets (id, name, public)
values ('monzu-artwork-images', 'monzu-artwork-images', false);

create policy monzu_storage_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'monzu-artwork-images' and (
    public.monzu_is_admin() or exists (
      select 1 from public.monzu_images i
      join public.monzu_artworks a on a.id = i.artwork_id
      where i.storage_path = storage.objects.name and a.status = 'published'
    )
  )
);
create policy monzu_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'monzu-artwork-images' and public.monzu_is_admin());
create policy monzu_storage_update on storage.objects for update to authenticated
using (bucket_id = 'monzu-artwork-images' and public.monzu_is_admin())
with check (bucket_id = 'monzu-artwork-images' and public.monzu_is_admin());
create policy monzu_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'monzu-artwork-images' and public.monzu_is_admin());
