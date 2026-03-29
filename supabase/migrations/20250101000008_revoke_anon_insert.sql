-- Revoke anon INSERT on items. Item creation now goes through
-- the server-side /api/items route using the service role key.
drop policy "Anyone can create items" on public.items;
