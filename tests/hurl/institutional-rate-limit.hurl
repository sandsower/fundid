# test-inst-rate has rate_limit_per_day=2. Third submission the same day must 429.
# Isolated from institutional-happy.hurl by using a different institution slug.

# Capture institution id for the final counter check.
GET {{supabase_url}}/rest/v1/institutions?slug=eq.test-inst-rate&select=id
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Captures]
inst_id: jsonpath "$[0].id"

# First submission — accepted.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-rate",
  "t": "TESTTOKENRATEBBBBBBBBBBBBBBBBBBBB",
  "category": "keys",
  "title": "Rate one"
}
HTTP 200
[Captures]
id_one: jsonpath "$.id"

# Second submission — accepted (count = 2 = limit).
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-rate",
  "t": "TESTTOKENRATEBBBBBBBBBBBBBBBBBBBB",
  "category": "keys",
  "title": "Rate two"
}
HTTP 200
[Captures]
id_two: jsonpath "$.id"

# Third submission — rate-limited.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-rate",
  "t": "TESTTOKENRATEBBBBBBBBBBBBBBBBBBBB",
  "category": "keys",
  "title": "Rate three should not land"
}
HTTP 429
[Asserts]
jsonpath "$.error" == "rate_limited"

# No third item exists.
GET {{supabase_url}}/rest/v1/items?title=eq.Rate%20three%20should%20not%20land&select=id
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$" count == 0

# Counter stayed at 2 — a rejected submission must not burn quota. Only
# today's row exists in this spec, so the sum equals today's count.
GET {{supabase_url}}/rest/v1/institution_submissions_daily?select=count&institution_id=eq.{{inst_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$" count == 1
jsonpath "$[0].count" == 2

# Audit expiry removes a row from the public map but does NOT restore a
# quota slot — the daily counter is monotonic to block submit/expire abuse
# loops by anyone with poster + audit access.
POST {{base_url}}/api/institution/expire
Content-Type: application/json
{
  "slug": "test-inst-rate",
  "audit_slug": "audit-rate-bbbbbbbbbbbbbbbbbbbbbbbbb",
  "item_id": "{{id_one}}"
}
HTTP 200

GET {{supabase_url}}/rest/v1/institution_submissions_daily?select=count&institution_id=eq.{{inst_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].count" == 2

# Subsequent submission is still rejected even after the expire.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-rate",
  "t": "TESTTOKENRATEBBBBBBBBBBBBBBBBBBBB",
  "category": "keys",
  "title": "Rate four after expire — should still 429"
}
HTTP 429

# Cleanup
DELETE {{supabase_url}}/rest/v1/items?id=eq.{{id_one}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204

DELETE {{supabase_url}}/rest/v1/items?id=eq.{{id_two}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
