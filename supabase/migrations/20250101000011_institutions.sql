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
-- RESTRICT on delete: institution_id is the discriminator for audit
-- kill-switch, auto-expire, and item-detail rendering. Silently nulling it
-- would strand active rows on the public map without pickup instructions or
-- operator controls. Offboarding must go through an explicit flow (expire
-- or reassign items first), which is enforced by the FK failing on delete
-- while anything still references the institution.
alter table public.items
  add column institution_id uuid references public.institutions(id) on delete restrict;

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
-- 4. Atomic institutional item insert with rate-limit check
-- Locks the institutions row, verifies daily count below limit, inserts
-- the item, then bumps the counter — all in one transaction. If the insert
-- fails the counter is not bumped, so failed requests never burn quota.
-- Returns (item_id, rate_limited): if rate_limited=true, item_id is null;
-- if the institution is missing both are null/false (callers validate
-- existence separately via token lookup).
------------------------------------------------------------------------
create or replace function insert_institutional_item(
  p_institution_id uuid,
  p_category text,
  p_title text,
  p_description text,
  p_image_url text
)
returns table (item_id uuid, rate_limited boolean) as $$
declare
  v_inst record;
  v_current_count int;
  v_new_id uuid;
begin
  select id, name, latitude, longitude, rate_limit_per_day
  into v_inst
  from public.institutions
  where id = p_institution_id
  for update;

  if not found then
    return query select null::uuid, false;
    return;
  end if;

  select coalesce(count, 0)
  into v_current_count
  from public.institution_submissions_daily
  where institution_id = p_institution_id and date = current_date;

  if v_current_count >= v_inst.rate_limit_per_day then
    return query select null::uuid, true;
    return;
  end if;

  insert into public.items (
    type, category, title, description, image_url,
    latitude, longitude, location_name, date_occurred,
    contact_method, contact_value, claim_code_hash,
    institution_id, status
  )
  values (
    'found',
    p_category,
    p_title,
    coalesce(p_description, ''),
    nullif(p_image_url, ''),
    v_inst.latitude,
    v_inst.longitude,
    v_inst.name,
    current_date,
    'anonymous',
    null,
    null,
    p_institution_id,
    'active'
  )
  returning id into v_new_id;

  insert into public.institution_submissions_daily (institution_id, date, count)
  values (p_institution_id, current_date, 1)
  on conflict (institution_id, date) do update
    set count = institution_submissions_daily.count + 1;

  return query select v_new_id, false;
end;
$$ language plpgsql security definer;

revoke execute on function insert_institutional_item(uuid, text, text, text, text)
  from anon, authenticated;
grant execute on function insert_institutional_item(uuid, text, text, text, text)
  to service_role;

------------------------------------------------------------------------
-- 5. Expire institutional item (audit-page kill-switch + auto-expire cron)
------------------------------------------------------------------------
-- Restores same-day quota when an item is expired through the audit
-- kill-switch (or auto-expire). Without this, abusing the daily limit early
-- would permanently wedge the institution until midnight even after bad
-- rows are removed. Only the same-day counter is affected; older rows don't
-- touch today's budget.
create or replace function expire_institutional_item(
  p_item_id uuid,
  p_institution_id uuid
)
returns boolean as $$
declare
  v_updated int;
  v_created_date date;
begin
  select created_at::date into v_created_date
  from public.items
  where id = p_item_id
    and institution_id = p_institution_id
    and status = 'active';

  update public.items
  set status = 'expired'
  where id = p_item_id
    and institution_id = p_institution_id
    and status = 'active';

  get diagnostics v_updated = row_count;

  if v_updated > 0 and v_created_date = current_date then
    update public.institution_submissions_daily
    set count = greatest(count - 1, 0)
    where institution_id = p_institution_id and date = current_date;
  end if;

  return v_updated > 0;
end;
$$ language plpgsql security definer;

revoke execute on function expire_institutional_item(uuid, uuid)
  from anon, authenticated;
grant execute on function expire_institutional_item(uuid, uuid)
  to service_role;
