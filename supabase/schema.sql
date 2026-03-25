-- Enable PostGIS for geospatial queries
create extension if not exists postgis;

-- Items table
create table public.items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('lost', 'found')),
  category text not null check (category in (
    'phone', 'wallet', 'keys', 'bag', 'glasses', 'clothing',
    'jewelry', 'documents', 'electronics', 'pet', 'bicycle', 'other'
  )),
  title text not null,
  description text not null default '',
  image_url text,
  latitude double precision not null,
  longitude double precision not null,
  location_name text not null,
  date_occurred date not null,
  status text not null default 'active' check (status in ('active', 'resolved', 'expired')),
  contact_method text not null default 'anonymous' check (contact_method in ('email', 'anonymous')),
  contact_value text,
  claim_code_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PostGIS geometry column for spatial queries
  geom geometry(Point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)
  ) stored
);

-- Indexes
create index idx_items_status on public.items (status);
create index idx_items_type on public.items (type);
create index idx_items_category on public.items (category);
create index idx_items_created_at on public.items (created_at desc);
create index idx_items_geom on public.items using gist (geom);

-- Row Level Security
alter table public.items enable row level security;

-- Anyone can read active items
create policy "Anyone can view active items"
  on public.items for select
  to anon, authenticated
  using (status = 'active');

-- Anyone can insert items (no auth required for MVP)
create policy "Anyone can create items"
  on public.items for insert
  to anon, authenticated
  with check (true);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on public.items
  for each row
  execute function update_updated_at();

-- Function: find nearby items (for matching)
create or replace function nearby_items(
  lat double precision,
  lng double precision,
  radius_km double precision default 2.0,
  item_type text default null,
  item_category text default null
)
returns setof public.items as $$
begin
  return query
    select *
    from public.items
    where status = 'active'
      and st_dwithin(
        geom,
        st_setsrid(st_makepoint(lng, lat), 4326)::geography,
        radius_km * 1000
      )
      and (item_type is null or type = item_type)
      and (item_category is null or category = item_category)
    order by geom <-> st_setsrid(st_makepoint(lng, lat), 4326)
    limit 50;
end;
$$ language plpgsql;

-- Function: verify claim code and mark item as resolved
create or replace function resolve_item(
  item_id uuid,
  code_hash text
)
returns boolean as $$
declare
  matched boolean;
begin
  update public.items
  set status = 'resolved'
  where id = item_id
    and claim_code_hash = code_hash
    and status = 'active';

  get diagnostics matched = row_count;
  return matched > 0;
end;
$$ language plpgsql security definer;

-- RLS policy: allow updates only through the resolve_item function
-- (no direct updates from anon clients)
create policy "No direct updates"
  on public.items for update
  to anon, authenticated, public
  using (false);

-- Storage bucket for item images
-- Run via Supabase dashboard: create bucket 'item-images' with public access
