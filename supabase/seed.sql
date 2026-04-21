-- Test fixtures for local development and Hurl specs.
-- Applied automatically on `supabase db reset`.
-- Coordinates are Reykjavik area for realistic PostGIS radius queries.

insert into public.items (type, category, title, description, latitude, longitude, location_name, date_occurred, contact_method, contact_value, claim_code_hash, status)
values
  ('lost', 'phone', 'iPhone 15 svartur', 'Týndi honum í strætó númer 1', 64.1466, -21.9426, 'Hlemmur', current_date - 1, 'email', 'test@example.com', 'seed-hash-1', 'active'),
  ('found', 'keys', 'Lyklakippa með rauðum borða', 'Fannst á bekk', 64.1355, -21.9278, 'Austurvöllur', current_date - 2, 'email', 'test@example.com', 'seed-hash-2', 'active'),
  ('lost', 'bag', 'Svartur bakpoki', 'Með fartölvu innanborðs', 64.1500, -21.9500, 'Miðbær', current_date - 3, 'email', 'test@example.com', 'seed-hash-3', 'resolved'),
  ('found', 'glasses', 'Lesgleraugu í brúnu hulstri', '', 64.1400, -21.9400, 'Laugavegur', current_date - 10, 'email', 'test@example.com', 'seed-hash-4', 'expired');

-- Test institutions for Hurl specs. Tokens are plaintext only in specs;
-- DB stores SHA-256(token) via pgcrypto's digest().
insert into public.institutions (slug, name, address, latitude, longitude, phone, hours_json, contact_email, token_hash, audit_slug, rate_limit_per_day)
values
  (
    'test-inst-happy',
    'Test Pool',
    'Barónsstígur 45, 101 Reykjavík',
    64.1433, -21.9280,
    '411 5300',
    '{"mon":[["06:30","22:00"]],"tue":[["06:30","22:00"]],"wed":[["06:30","22:00"]],"thu":[["06:30","22:00"]],"fri":[["06:30","22:00"]],"sat":[["08:00","20:00"]],"sun":[["08:00","20:00"]]}'::jsonb,
    'test-happy@example.com',
    encode(digest('TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA', 'sha256'), 'hex'),
    'audit-happy-aaaaaaaaaaaaaaaaaaaaaaaa',
    20
  ),
  (
    'test-inst-rate',
    'Test Rate Pool',
    'Rate Address 1',
    64.1450, -21.9300,
    null,
    null,
    'test-rate@example.com',
    encode(digest('TESTTOKENRATEBBBBBBBBBBBBBBBBBBBB', 'sha256'), 'hex'),
    'audit-rate-bbbbbbbbbbbbbbbbbbbbbbbbb',
    2
  );
