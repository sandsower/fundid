-- Audit every _dispatch_email call so we can trace whether a queued email
-- actually left pg_net and what HTTP status came back from the Edge Function.
-- The previous _dispatch_email used `perform net.http_post(...)` which
-- discards pg_net's request_id, leaving no way to correlate a complaint
-- ("never got my claim code email") with the underlying dispatch attempt.

create table if not exists private.email_dispatches (
  id bigserial primary key,
  payload_type text not null,
  item_id uuid,
  recipient text,
  request_id bigint,
  config_complete boolean not null,
  dispatched_at timestamptz not null default now()
);

create index if not exists idx_email_dispatches_item
  on private.email_dispatches (item_id, dispatched_at desc);

create index if not exists idx_email_dispatches_request
  on private.email_dispatches (request_id)
  where request_id is not null;

create or replace function _dispatch_email(payload json)
returns void as $$
declare
  v_url text;
  v_secret text;
  v_anon_key text;
  v_request_id bigint;
  v_config_complete boolean;
begin
  select value into v_url from private.app_config where key = 'edge_function_url';
  select value into v_secret from private.app_config where key = 'edge_function_secret';
  select value into v_anon_key from private.app_config where key = 'supabase_anon_key';

  v_config_complete := v_url is not null and v_secret is not null and v_anon_key is not null;

  if not v_config_complete then
    insert into private.email_dispatches (payload_type, item_id, recipient, request_id, config_complete)
    values (
      payload->>'type',
      nullif(payload->>'itemId', '')::uuid,
      payload->>'to',
      null,
      false
    );
    raise warning 'Edge function config not complete — email not sent';
    return;
  end if;

  select net.http_post(
    url := v_url,
    body := payload::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key,
      'x-edge-secret', v_secret
    )
  ) into v_request_id;

  insert into private.email_dispatches (payload_type, item_id, recipient, request_id, config_complete)
  values (
    payload->>'type',
    nullif(payload->>'itemId', '')::uuid,
    payload->>'to',
    v_request_id,
    true
  );
end;
$$ language plpgsql security definer;

-- View joining the audit table with pg_net's response table. SQL-editor
-- only (private schema, not exposed via PostgREST). `outcome` collapses
-- the join into one of: config_missing | queue_failed | pending |
-- timed_out | error | sent | http_error.
create or replace view private.email_dispatch_status as
select
  d.id,
  d.payload_type,
  d.item_id,
  d.recipient,
  d.request_id,
  d.config_complete,
  d.dispatched_at,
  r.status_code,
  r.error_msg,
  r.timed_out,
  r.created as response_at,
  case
    when not d.config_complete then 'config_missing'
    when d.request_id is null then 'queue_failed'
    when r.id is null then 'pending'
    when r.timed_out then 'timed_out'
    when r.error_msg is not null then 'error'
    when r.status_code between 200 and 299 then 'sent'
    else 'http_error'
  end as outcome
from private.email_dispatches d
left join net._http_response r on r.id = d.request_id;
