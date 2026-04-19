# test-inst-rate has rate_limit_per_day=2. Third submission the same day must 429.
# Isolated from institutional-happy.hurl by using a different institution slug.

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

# Cleanup
DELETE {{supabase_url}}/rest/v1/items?id=eq.{{id_one}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204

DELETE {{supabase_url}}/rest/v1/items?id=eq.{{id_two}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
