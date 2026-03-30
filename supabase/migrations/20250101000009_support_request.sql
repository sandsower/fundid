------------------------------------------------------------------------
-- Support request: allows users to request help resolving items
-- when they've lost their claim code
------------------------------------------------------------------------

create or replace function send_support_request(
  p_item_id uuid,
  p_requester_email text,
  p_item_title text,
  p_matches_contact boolean
)
returns boolean as $$
declare
  v_item record;
begin
  -- Validate email format
  if not _is_valid_email(p_requester_email) then
    raise exception 'Invalid email address';
  end if;

  -- Verify item exists and is active
  select id, title, status into v_item
  from public.items
  where id = p_item_id;

  if not found then
    return false;
  end if;

  -- Dispatch support email to admin
  perform _dispatch_email(json_build_object(
    'type', 'support_request',
    'requesterEmail', p_requester_email,
    'itemId', p_item_id,
    'itemTitle', coalesce(p_item_title, v_item.title),
    'itemStatus', v_item.status,
    'matchesContact', p_matches_contact
  ));

  return true;
end;
$$ language plpgsql security definer;

-- Allow service_role to call this (API route uses service role key)
revoke execute on function send_support_request from anon, authenticated;
grant execute on function send_support_request to service_role;
