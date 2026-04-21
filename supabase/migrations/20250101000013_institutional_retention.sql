-- Extend cleanup_expired_items so institutional rows that auto-expire at 30d
-- also drop out of the database + R2 after a retention window. Without this,
-- expired institutional rows accumulated indefinitely because the existing
-- predicate only matched `resolved` (90d) and `active` (6mo) — institutional
-- rows go straight from `active` to `expired` via expire_old_institutional_items.
-- 90d after expiry matches the peer-resolved retention window.

create or replace function cleanup_expired_items()
returns json as $$
declare
  v_expired_ids uuid[];
  v_image_urls text[];
  v_items_deleted int;
  v_messages_deleted int;
  v_attempts_deleted int;
begin
  select array_agg(id)
  into v_expired_ids
  from public.items
  where
    (status = 'resolved' and updated_at < now() - interval '90 days')
    or
    (status = 'active' and created_at < now() - interval '6 months')
    or
    (status = 'expired' and updated_at < now() - interval '90 days');

  if v_expired_ids is null or array_length(v_expired_ids, 1) is null then
    return json_build_object(
      'items_deleted', 0,
      'messages_deleted', 0,
      'attempts_deleted', 0,
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
