-- Security hardening migration
-- Fixes: PII leakage in RPCs (#3, #4), server-side email dispatch (#2, #5),
-- email validation (#12), resolve rate limiting (#6), reply token expiry (#13),
-- item deletion (#7), per-sender rate limiting (#11)

-- Enable pg_net for server-side HTTP calls
create extension if not exists pg_net with schema extensions;

-- Drop existing functions that will be replaced (signature changes)
drop function if exists send_contact_message(uuid, text, text, text);
drop function if exists reply_to_message(text, text);
drop function if exists get_message_by_token(text);
drop function if exists resolve_item(uuid, text);

-- Config table for internal settings (not exposed via PostgREST API)
-- Uses a private schema so RLS isn't needed — anon/authenticated roles have no access
create schema if not exists private;

create table if not exists private.app_config (
  key text primary key,
  value text not null
);

-- Populate after running this migration:
--   INSERT INTO private.app_config (key, value) VALUES
--     ('edge_function_url', 'https://<project>.supabase.co/functions/v1/send-email'),
--     ('edge_function_secret', '<your-secret>');

------------------------------------------------------------------------
-- Helper: dispatch email via Edge Function (server-side only)
------------------------------------------------------------------------
create or replace function _dispatch_email(payload json)
returns void as $$
declare
  v_url text;
  v_secret text;
  v_anon_key text;
begin
  select value into v_url from private.app_config where key = 'edge_function_url';
  select value into v_secret from private.app_config where key = 'edge_function_secret';
  select value into v_anon_key from private.app_config where key = 'supabase_anon_key';

  if v_url is null or v_secret is null or v_anon_key is null then
    raise warning 'Edge function config not complete — email not sent';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := payload::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key,
      'x-edge-secret', v_secret
    )
  );
end;
$$ language plpgsql security definer;

------------------------------------------------------------------------
-- Email validation helper
------------------------------------------------------------------------
create or replace function _is_valid_email(email text)
returns boolean as $$
begin
  return email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$';
end;
$$ language plpgsql immutable;

-- Add CHECK constraints for email fields
alter table public.items
  add constraint chk_contact_value_email
  check (contact_method != 'email' or _is_valid_email(contact_value));

alter table public.contact_messages
  add constraint chk_sender_email
  check (_is_valid_email(sender_email));

------------------------------------------------------------------------
-- Resolve attempt tracking (rate limiting for claim code brute-force)
------------------------------------------------------------------------
create table if not exists public.resolve_attempts (
  item_id uuid not null references public.items(id),
  attempted_at timestamptz not null default now()
);

create index idx_resolve_attempts_item on public.resolve_attempts (item_id, attempted_at);

alter table public.resolve_attempts enable row level security;

create policy "No public access to resolve_attempts"
  on public.resolve_attempts for all
  to anon, authenticated
  using (false);

------------------------------------------------------------------------
-- Rewrite: send_contact_message — emails server-side, no PII in return
------------------------------------------------------------------------
create or replace function send_contact_message(
  p_item_id uuid,
  p_sender_name text,
  p_sender_email text,
  p_message text
)
returns json as $$
declare
  v_recent_count_item integer;
  v_recent_count_sender integer;
  v_poster_email text;
  v_item_title text;
  v_item_type text;
  v_item_status text;
  v_message_id uuid;
  v_reply_token text;
begin
  -- Validate email format
  if not _is_valid_email(p_sender_email) then
    return json_build_object('success', false, 'error', 'invalid_email');
  end if;

  -- Check item exists and is active
  select contact_value, title, type, status
  into v_poster_email, v_item_title, v_item_type, v_item_status
  from public.items
  where id = p_item_id;

  if v_poster_email is null or v_item_status != 'active' then
    return json_build_object('success', false, 'error', 'item_not_found');
  end if;

  -- Rate limit: max 10 messages per item per 24h
  select count(*) into v_recent_count_item
  from public.contact_messages
  where item_id = p_item_id
    and created_at > now() - interval '24 hours';

  if v_recent_count_item >= 10 then
    return json_build_object('success', false, 'error', 'rate_limited');
  end if;

  -- Rate limit: max 20 messages per sender email per 24h (across all items)
  select count(*) into v_recent_count_sender
  from public.contact_messages
  where sender_email = p_sender_email
    and created_at > now() - interval '24 hours';

  if v_recent_count_sender >= 20 then
    return json_build_object('success', false, 'error', 'rate_limited');
  end if;

  -- Insert message and get the reply token
  insert into public.contact_messages (item_id, sender_name, sender_email, message)
  values (p_item_id, p_sender_name, p_sender_email, p_message)
  returning id, reply_token into v_message_id, v_reply_token;

  -- Dispatch email server-side (fire and forget via pg_net)
  perform _dispatch_email(json_build_object(
    'type', 'contact_notification',
    'posterEmail', v_poster_email,
    'senderName', p_sender_name,
    'message', p_message,
    'itemTitle', v_item_title,
    'itemType', v_item_type,
    'itemId', p_item_id,
    'replyToken', v_reply_token
  ));

  -- Return sanitized response — NO PII
  return json_build_object(
    'success', true,
    'message_id', v_message_id
  );
end;
$$ language plpgsql security definer;

------------------------------------------------------------------------
-- Rewrite: reply_to_message — emails server-side, no PII in return
------------------------------------------------------------------------
create or replace function reply_to_message(
  p_reply_token text,
  p_reply_text text
)
returns json as $$
declare
  v_msg record;
begin
  -- Get the message, check not replied and not expired (30 days)
  select cm.*, i.title as item_title, i.type as item_type, i.contact_value as poster_email, i.id as iid
  into v_msg
  from public.contact_messages cm
  join public.items i on i.id = cm.item_id
  where cm.reply_token = p_reply_token
    and cm.replied_at is null
    and cm.created_at > now() - interval '30 days';

  if v_msg is null then
    return json_build_object('success', false, 'error', 'not_found_or_already_replied');
  end if;

  -- Mark as replied
  update public.contact_messages
  set replied_at = now()
  where reply_token = p_reply_token;

  -- Dispatch reply notification server-side
  perform _dispatch_email(json_build_object(
    'type', 'reply_notification',
    'sender_email', v_msg.sender_email,
    'sender_name', v_msg.sender_name,
    'item_id', v_msg.item_id,
    'item_title', v_msg.item_title,
    'reply_text', p_reply_text
  ));

  -- Return sanitized response — NO PII
  return json_build_object(
    'success', true
  );
end;
$$ language plpgsql security definer;

------------------------------------------------------------------------
-- Rewrite: get_message_by_token — add 30-day expiration
------------------------------------------------------------------------
create or replace function get_message_by_token(p_reply_token text)
returns json as $$
declare
  v_msg record;
begin
  select cm.id, cm.sender_name, cm.message, cm.created_at, cm.replied_at,
         i.id as item_id, i.title as item_title, i.type as item_type
  into v_msg
  from public.contact_messages cm
  join public.items i on i.id = cm.item_id
  where cm.reply_token = p_reply_token
    and cm.created_at > now() - interval '30 days';

  if v_msg is null then
    return json_build_object('success', false, 'error', 'not_found');
  end if;

  return json_build_object(
    'success', true,
    'message_id', v_msg.id,
    'sender_name', v_msg.sender_name,
    'message', v_msg.message,
    'created_at', v_msg.created_at,
    'replied_at', v_msg.replied_at,
    'item_id', v_msg.item_id,
    'item_title', v_msg.item_title,
    'item_type', v_msg.item_type
  );
end;
$$ language plpgsql security definer;

------------------------------------------------------------------------
-- Rewrite: resolve_item — add brute-force rate limiting
------------------------------------------------------------------------
create or replace function resolve_item(
  item_id uuid,
  code_hash text
)
returns boolean as $$
declare
  v_recent_attempts integer;
  matched boolean;
begin
  -- Rate limit: max 5 attempts per item per hour
  select count(*) into v_recent_attempts
  from public.resolve_attempts
  where resolve_attempts.item_id = resolve_item.item_id
    and attempted_at > now() - interval '1 hour';

  if v_recent_attempts >= 5 then
    return false;
  end if;

  -- Log the attempt
  insert into public.resolve_attempts (item_id) values (resolve_item.item_id);

  update public.items
  set status = 'resolved'
  where id = resolve_item.item_id
    and claim_code_hash = code_hash
    and status = 'active';

  get diagnostics matched = row_count;
  return matched > 0;
end;
$$ language plpgsql security definer;

------------------------------------------------------------------------
-- New: send_claim_code_email — called after item insert
------------------------------------------------------------------------
create or replace function send_claim_code_email(
  p_item_id uuid,
  p_to_email text,
  p_claim_code text,
  p_item_title text
)
returns void as $$
begin
  perform _dispatch_email(json_build_object(
    'type', 'claim_code',
    'to', p_to_email,
    'claimCode', p_claim_code,
    'itemTitle', p_item_title,
    'itemId', p_item_id
  ));
end;
$$ language plpgsql security definer;

------------------------------------------------------------------------
-- New: delete_item — gated on claim code hash, for GDPR erasure
------------------------------------------------------------------------
create or replace function delete_item(
  p_item_id uuid,
  p_code_hash text
)
returns json as $$
declare
  v_deleted boolean;
begin
  -- Delete the item if claim code matches
  delete from public.items
  where id = p_item_id
    and claim_code_hash = p_code_hash;

  get diagnostics v_deleted = row_count;

  if not v_deleted then
    return json_build_object('success', false, 'error', 'invalid_code');
  end if;

  -- Cascade: delete associated contact messages
  delete from public.contact_messages where item_id = p_item_id;

  -- Cascade: delete resolve attempts
  delete from public.resolve_attempts where item_id = p_item_id;

  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Allow deletes through the function (RLS still blocks direct deletes)
create policy "No direct deletes on items"
  on public.items for delete
  to anon, authenticated
  using (false);

create policy "No direct deletes on contact messages"
  on public.contact_messages for delete
  to anon, authenticated
  using (false);
