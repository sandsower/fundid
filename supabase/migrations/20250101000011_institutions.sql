-- Institutional L&F: trusted partners (pools, Strætó, malls) submit items
-- via QR poster at their desk. No claimant-side resolve; items auto-expire.
-- Design: memento notes/fundid-institutional-lost-found-mvp-design

------------------------------------------------------------------------
-- 1. Institutions table
------------------------------------------------------------------------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  phone text,
  hours_json jsonb,
  contact_email text not null,
  token_hash text not null,
  audit_slug text not null unique,
  rate_limit_per_day int not null default 20 check (rate_limit_per_day > 0),
  created_at timestamptz not null default now()
);

create index idx_institutions_slug on public.institutions (slug);
create index idx_institutions_audit_slug on public.institutions (audit_slug);

alter table public.institutions enable row level security;

-- Base table has no public SELECT policy. token_hash is a submission credential
-- (anyone knowing it can file items) and audit_slug is a kill-switch credential
-- (anyone knowing it + slug + item_id can expire items via /api/institution/expire).
-- Neither may be exposed to anon. Server routes that need these columns read via
-- service role, which bypasses RLS.
revoke all on public.institutions from anon, authenticated;

-- Public-safe projection for the client item detail page (and any future public
-- reads). Owner is postgres, so the view bypasses RLS on the base table but only
-- exposes the columns listed here. Never add token_hash or audit_slug.
create view public.institutions_public as
  select id, slug, name, address, latitude, longitude, phone, hours_json
  from public.institutions;

grant select on public.institutions_public to anon, authenticated;

------------------------------------------------------------------------
-- 2. Items: add nullable institution FK
------------------------------------------------------------------------
alter table public.items
  add column institution_id uuid references public.institutions(id);

create index idx_items_institution_id
  on public.items (institution_id)
  where institution_id is not null;

------------------------------------------------------------------------
-- 3. Daily submission counts for per-institution rate limiting
------------------------------------------------------------------------
create table public.institution_submissions_daily (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  date date not null,
  count int not null default 0,
  primary key (institution_id, date)
);

alter table public.institution_submissions_daily enable row level security;
-- No public policies — service role only

------------------------------------------------------------------------
-- 4. Atomic increment + rate-limit check
-- Returns new count, or -1 if over limit.
-- Locks institutions row FOR UPDATE so concurrent requests serialize.
------------------------------------------------------------------------
create or replace function increment_institution_submission_count(
  p_institution_id uuid
)
returns int as $$
declare
  v_limit int;
  v_new_count int;
begin
  select rate_limit_per_day into v_limit
  from public.institutions
  where id = p_institution_id
  for update;

  if v_limit is null then
    return -1;
  end if;

  insert into public.institution_submissions_daily (institution_id, date, count)
  values (p_institution_id, current_date, 1)
  on conflict (institution_id, date) do update
    set count = institution_submissions_daily.count + 1
  returning count into v_new_count;

  if v_new_count > v_limit then
    update public.institution_submissions_daily
    set count = count - 1
    where institution_id = p_institution_id and date = current_date;
    return -1;
  end if;

  return v_new_count;
end;
$$ language plpgsql security definer;

revoke execute on function increment_institution_submission_count(uuid)
  from anon, authenticated;
grant execute on function increment_institution_submission_count(uuid)
  to service_role;

------------------------------------------------------------------------
-- 5. Expire institutional item (audit-page kill-switch + auto-expire cron)
------------------------------------------------------------------------
create or replace function expire_institutional_item(
  p_item_id uuid,
  p_institution_id uuid
)
returns boolean as $$
declare
  v_updated int;
begin
  update public.items
  set status = 'expired'
  where id = p_item_id
    and institution_id = p_institution_id
    and status = 'active';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$ language plpgsql security definer;

revoke execute on function expire_institutional_item(uuid, uuid)
  from anon, authenticated;
grant execute on function expire_institutional_item(uuid, uuid)
  to service_role;
