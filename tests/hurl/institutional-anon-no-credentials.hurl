# RLS regression: anon cannot read secret-bearing columns from institutions.
# audit_slug is the bearer credential for /api/institution/expire; token_hash
# is the hashed submission credential. Neither may leak via PostgREST.
# The safe projection lives in public.institutions_public.

# 1. Anon SELECT on base institutions is rejected (RLS enabled, no anon policy,
# and we revoked table-level privileges from anon).
GET {{supabase_url}}/rest/v1/institutions?select=id,slug,audit_slug,token_hash
apikey: {{publishable_key}}
Authorization: Bearer {{publishable_key}}
HTTP *
[Asserts]
status >= 400
status < 500

# 2. Safe view is queryable by anon and exposes only public columns.
GET {{supabase_url}}/rest/v1/institutions_public?slug=eq.test-inst-happy&select=id,slug,name,address,latitude,longitude,phone,hours_json
apikey: {{publishable_key}}
Authorization: Bearer {{publishable_key}}
HTTP 200
[Asserts]
jsonpath "$" count == 1
jsonpath "$[0].slug" == "test-inst-happy"
jsonpath "$[0].name" == "Test Pool"

# 3. Requesting secret columns from the safe view fails — they don't exist there.
GET {{supabase_url}}/rest/v1/institutions_public?select=audit_slug
apikey: {{publishable_key}}
Authorization: Bearer {{publishable_key}}
HTTP *
[Asserts]
status >= 400
status < 500

GET {{supabase_url}}/rest/v1/institutions_public?select=token_hash
apikey: {{publishable_key}}
Authorization: Bearer {{publishable_key}}
HTTP *
[Asserts]
status >= 400
status < 500
