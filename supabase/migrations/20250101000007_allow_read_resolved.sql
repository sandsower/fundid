-- Allow reading items regardless of status so detail pages work after resolution.
-- The listing page filters by status='active' in its query; RLS no longer needs to.
drop policy "Anyone can view active items" on public.items;

create policy "Anyone can view items"
  on public.items for select
  to anon, authenticated
  using (true);
