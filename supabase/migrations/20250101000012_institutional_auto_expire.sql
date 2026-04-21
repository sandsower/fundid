-- expire_old_institutional_items: flips active institutional items older
-- than p_threshold_days to 'expired'. Peer-to-peer items are never touched.
-- Dry-run mode lists candidate count without updating; used for the first week
-- after rollout to sanity-check the cron before letting it mutate rows.

create or replace function expire_old_institutional_items(
  p_dry_run boolean default true,
  p_threshold_days int default 30
)
returns json as $$
declare
  v_candidate_count int;
  v_items_expired int := 0;
begin
  select count(*)
  into v_candidate_count
  from public.items
  where institution_id is not null
    and status = 'active'
    and created_at < now() - make_interval(days => p_threshold_days);

  if p_dry_run then
    return json_build_object(
      'dry_run', true,
      'threshold_days', p_threshold_days,
      'candidate_count', v_candidate_count,
      'items_expired', 0
    );
  end if;

  update public.items
  set status = 'expired'
  where institution_id is not null
    and status = 'active'
    and created_at < now() - make_interval(days => p_threshold_days);

  get diagnostics v_items_expired = row_count;

  return json_build_object(
    'dry_run', false,
    'threshold_days', p_threshold_days,
    'candidate_count', v_candidate_count,
    'items_expired', v_items_expired
  );
end;
$$ language plpgsql security definer;

revoke execute on function expire_old_institutional_items(boolean, int)
  from anon, authenticated;
grant execute on function expire_old_institutional_items(boolean, int)
  to service_role;
