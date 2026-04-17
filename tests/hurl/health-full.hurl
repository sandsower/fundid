# Proves SvelteKit dev server + local Supabase end-to-end.
# When .env.local points at 127.0.0.1:54321, checks.database.ok must be true.

GET {{base_url}}/api/health
HTTP 200
[Asserts]
jsonpath "$.status" == "healthy"
jsonpath "$.checks.database.ok" == true
jsonpath "$.checks.storage.ok" == true
