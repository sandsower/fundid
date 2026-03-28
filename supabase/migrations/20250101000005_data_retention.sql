------------------------------------------------------------------------
-- Data retention: auto-delete expired items
-- Policy: 90 days after resolution, 6 months for unresolved
-- Called by Cloudflare Worker cron (daily at 3am UTC)
------------------------------------------------------------------------

create or replace function cleanup_expired_items()
returns json as $$
declare
  v_expired_ids uuid[];
  v_image_urls text[];
  v_items_deleted int;
  v_messages_deleted int;
  v_attempts_deleted int;
begin
  -- Collect IDs of items past retention
  select array_agg(id)
  into v_expired_ids
  from public.items
  where
    (status = 'resolved' and updated_at < now() - interval '90 days')
    or
    (status = 'active' and created_at < now() - interval '6 months');

  -- Nothing to clean up
  if v_expired_ids is null or array_length(v_expired_ids, 1) is null then
    return json_build_object(
      'items_deleted', 0,
      'messages_deleted', 0,
      'attempts_deleted', 0,
      'image_paths', json_build_array()
    );
  end if;

  -- Collect image URLs before deletion (caller handles storage cleanup)
  select array_agg(image_url)
  into v_image_urls
  from public.items
  where id = any(v_expired_ids)
    and image_url is not null;

  -- Delete cascade: contact_messages
  delete from public.contact_messages
  where item_id = any(v_expired_ids);
  get diagnostics v_messages_deleted = row_count;

  -- Delete cascade: resolve_attempts
  delete from public.resolve_attempts
  where item_id = any(v_expired_ids);
  get diagnostics v_attempts_deleted = row_count;

  -- Delete the items
  delete from public.items
  where id = any(v_expired_ids);
  get diagnostics v_items_deleted = row_count;

  return json_build_object(
    'items_deleted', v_items_deleted,
    'messages_deleted', v_messages_deleted,
    'attempts_deleted', v_attempts_deleted,
    'image_paths', coalesce(to_json(v_image_urls), '[]'::json)
  );
end;
$$ language plpgsql security definer;
