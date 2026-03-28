------------------------------------------------------------------------
-- Storage bucket: item-images
-- Creates bucket via SQL (idempotent) and adds RLS policies
-- MIME: image/* only, max 2MB, public read, no API deletes
------------------------------------------------------------------------

-- Ensure the bucket exists (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  true,
  2097152,  -- 2MB
  array['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access
create policy "Anyone can view item images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'item-images');

-- Anyone can upload (anonymous app)
create policy "Anyone can upload item images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'item-images');

-- No deletes via API (only service key bypasses RLS)
create policy "No public deletes on item images"
  on storage.objects for delete
  to anon, authenticated
  using (false);
