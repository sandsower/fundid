-- Audit every _dispatch_email call so we can trace whether a queued email
-- actually left pg_net and what HTTP status came back from the Edge Function.
-- The previous _dispatch_email used `perform net.http_post(...)` which
-- discards pg_net's request_id, leaving no way to correlate a complaint
-- ("never got my claim code email") with the underlying dispatch attempt.
--
-- Retention: this table holds recipient emails as PII, so cleanup_expired_items
-- (daily cron) prunes rows older than 30 days plus any tied to a deleted item.
-- pg_net's net._http_response entries expire on its own short clock (~6h), so
-- audit rows past that window are useful only for "did a dispatch happen for
-- item X / address Y" complaints, which 30 days covers comfortably.

-- item_id has ON DELETE CASCADE so any item deletion path (delete_item RPC for
-- claim-code erasure, admin delete, cleanup_expired_items, future paths) drops
-- the audit rows automatically. Without the FK, recipient emails could outlive
-- the listing they relate to, breaking GDPR erasure expectations.
create table if not exists private.email_dispatches (
  id bigserial primary key,
  payload_type text not null,
  item_id uuid references public.items(id) on delete cascade,
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
  -- Coalesce across the four payload shapes in use:
  --   claim_code: 'to', 'itemId'
  --   contact_notification: 'posterEmail', 'itemId'
  --   reply_notification: 'recipient_email', 'item_id'
  --   support_request: 'requesterEmail', no item id
  -- Without this, audit rows for non-claim_code dispatches would land with
  -- null recipient/item_id and the "did user X get their email?" query breaks.
  v_item_id uuid := nullif(coalesce(payload->>'itemId', payload->>'item_id'), '')::uuid;
  v_recipient text := coalesce(
    payload->>'to',
    payload->>'posterEmail',
    payload->>'recipient_email',
    payload->>'requesterEmail'
  );
begin
  select value into v_url from private.app_config where key = 'edge_function_url';
  select value into v_secret from private.app_config where key = 'edge_function_secret';
  select value into v_anon_key from private.app_config where key = 'supabase_anon_key';

  v_config_complete := v_url is not null and v_secret is not null and v_anon_key is not null;

  if not v_config_complete then
    insert into private.email_dispatches (payload_type, item_id, recipient, request_id, config_complete)
    values (payload->>'type', v_item_id, v_recipient, null, false);
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
  values (payload->>'type', v_item_id, v_recipient, v_request_id, true);
end;
$$ language plpgsql security definer;

-- Extend daily retention cron with a 30-day TTL prune for orphan audit rows
-- (dispatches that have no item_id, e.g. support_request, or whose item was
-- already deleted before this cron ran). Item-tied dispatches cascade-delete
-- via the FK above, so this only handles the TTL case.
create or replace function cleanup_expired_items()
returns json as $$
declare
  v_expired_ids uuid[];
  v_image_urls text[];
  v_items_deleted int;
  v_messages_deleted int;
  v_attempts_deleted int;
  v_dispatches_deleted int;
begin
  select array_agg(id)
  into v_expired_ids
  from public.items
  where
    (status = 'resolved' and updated_at < now() - interval '90 days')
    or
    (status = 'active' and created_at < now() - interval '6 months');

  -- TTL prune runs every day regardless of items expiring.
  delete from private.email_dispatches
  where dispatched_at < now() - interval '30 days';
  get diagnostics v_dispatches_deleted = row_count;

  if v_expired_ids is null or array_length(v_expired_ids, 1) is null then
    return json_build_object(
      'items_deleted', 0,
      'messages_deleted', 0,
      'attempts_deleted', 0,
      'dispatches_deleted', v_dispatches_deleted,
      'image_paths', json_build_array()
    );
  end if;

  select array_agg(image_url)
  into v_image_urls
  from public.items
  where id = any(v_expired_ids)
    and image_url is not null;

  delete from public.contact_messages
  where item_id = any(v_expired_ids);
  get diagnostics v_messages_deleted = row_count;

  delete from public.resolve_attempts
  where item_id = any(v_expired_ids);
  get diagnostics v_attempts_deleted = row_count;

  -- Item delete cascades to private.email_dispatches via FK.
  delete from public.items
  where id = any(v_expired_ids);
  get diagnostics v_items_deleted = row_count;

  return json_build_object(
    'items_deleted', v_items_deleted,
    'messages_deleted', v_messages_deleted,
    'attempts_deleted', v_attempts_deleted,
    'dispatches_deleted', v_dispatches_deleted,
    'image_paths', coalesce(to_json(v_image_urls), '[]'::json)
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
