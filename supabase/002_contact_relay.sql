-- Contact messages table
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  sender_name text not null,
  sender_email text not null,
  message text not null check (char_length(message) <= 500),
  reply_token text unique default encode(gen_random_bytes(24), 'hex'),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_contact_messages_item on public.contact_messages (item_id);
create index idx_contact_messages_created on public.contact_messages (created_at desc);
create index idx_contact_messages_reply_token on public.contact_messages (reply_token);

alter table public.contact_messages enable row level security;

-- Anyone can insert a contact message (via RPC only in practice)
create policy "Anyone can send contact messages"
  on public.contact_messages for insert
  to anon, authenticated, public
  with check (true);

-- No one can read contact messages through the API directly
create policy "No public read on contact messages"
  on public.contact_messages for select
  to anon, authenticated
  using (false);

-- No direct updates
create policy "No direct updates on contact messages"
  on public.contact_messages for update
  to anon, authenticated
  using (false);

-- Rate limit: max 5 messages per item per IP/session per 24h
-- (simplified: max 5 messages per item per 24h total for MVP)
create or replace function send_contact_message(
  p_item_id uuid,
  p_sender_name text,
  p_sender_email text,
  p_message text
)
returns json as $$
declare
  v_recent_count integer;
  v_poster_email text;
  v_item_title text;
  v_item_type text;
  v_item_status text;
  v_message_id uuid;
  v_reply_token text;
begin
  -- Check item exists and is active
  select contact_value, title, type, status
  into v_poster_email, v_item_title, v_item_type, v_item_status
  from public.items
  where id = p_item_id;

  if v_poster_email is null or v_item_status != 'active' then
    return json_build_object('success', false, 'error', 'item_not_found');
  end if;

  -- Rate limit: max 10 messages per item per 24h
  select count(*) into v_recent_count
  from public.contact_messages
  where item_id = p_item_id
    and created_at > now() - interval '24 hours';

  if v_recent_count >= 10 then
    return json_build_object('success', false, 'error', 'rate_limited');
  end if;

  -- Insert message and get the reply token
  insert into public.contact_messages (item_id, sender_name, sender_email, message)
  values (p_item_id, p_sender_name, p_sender_email, p_message)
  returning id, reply_token into v_message_id, v_reply_token;

  -- Return data for the Edge Function to send notification email
  return json_build_object(
    'success', true,
    'poster_email', v_poster_email,
    'item_title', v_item_title,
    'item_type', v_item_type,
    'sender_name', p_sender_name,
    'message', p_message,
    'reply_token', v_reply_token,
    'message_id', v_message_id
  );
end;
$$ language plpgsql security definer;

-- Function: poster replies to a message
create or replace function reply_to_message(
  p_reply_token text,
  p_reply_text text
)
returns json as $$
declare
  v_msg record;
  v_poster_email text;
begin
  -- Get the message and check it hasn't been replied to
  select cm.*, i.title as item_title, i.type as item_type, i.contact_value as poster_email
  into v_msg
  from public.contact_messages cm
  join public.items i on i.id = cm.item_id
  where cm.reply_token = p_reply_token
    and cm.replied_at is null;

  if v_msg is null then
    return json_build_object('success', false, 'error', 'not_found_or_already_replied');
  end if;

  -- Mark as replied
  update public.contact_messages
  set replied_at = now()
  where reply_token = p_reply_token;

  return json_build_object(
    'success', true,
    'sender_email', v_msg.sender_email,
    'sender_name', v_msg.sender_name,
    'item_id', v_msg.item_id,
    'item_title', v_msg.item_title,
    'item_type', v_msg.item_type,
    'reply_text', p_reply_text
  );
end;
$$ language plpgsql security definer;

-- Function: get message by reply token (for poster to see before replying)
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
  where cm.reply_token = p_reply_token;

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
