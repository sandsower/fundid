-- Test fixtures for local development and Hurl specs.
-- Applied automatically on `supabase db reset`.
-- Coordinates are Reykjavik area for realistic PostGIS radius queries.

insert into public.items (type, category, title, description, latitude, longitude, location_name, date_occurred, contact_method, contact_value, claim_code_hash, status)
values
  ('lost', 'phone', 'iPhone 15 svartur', 'Týndi honum í strætó númer 1', 64.1466, -21.9426, 'Hlemmur', current_date - 1, 'email', 'test@example.com', 'seed-hash-1', 'active'),
  ('found', 'keys', 'Lyklakippa með rauðum borða', 'Fannst á bekk', 64.1355, -21.9278, 'Austurvöllur', current_date - 2, 'email', 'test@example.com', 'seed-hash-2', 'active'),
  ('lost', 'bag', 'Svartur bakpoki', 'Með fartölvu innanborðs', 64.1500, -21.9500, 'Miðbær', current_date - 3, 'email', 'test@example.com', 'seed-hash-3', 'resolved'),
  ('found', 'glasses', 'Lesgleraugu í brúnu hulstri', '', 64.1400, -21.9400, 'Laugavegur', current_date - 10, 'email', 'test@example.com', 'seed-hash-4', 'expired');
