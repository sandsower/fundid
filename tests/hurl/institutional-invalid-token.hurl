# Invalid token → 403. Also covers unknown slug and missing fields.

# 1. Wrong token against a valid slug.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-happy",
  "t": "WRONGTOKENZZZZZZZZZZZZZZZZZZZZZZ",
  "category": "wallet",
  "title": "Should not insert"
}
HTTP 403
[Asserts]
jsonpath "$.error" == "invalid_institution"

# 2. Unknown slug.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "does-not-exist",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "wallet",
  "title": "Should not insert"
}
HTTP 403
[Asserts]
jsonpath "$.error" == "invalid_institution"

# 3. Missing title fails validation after token passes.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-happy",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "wallet"
}
HTTP 400
[Asserts]
jsonpath "$.error" == "missing_fields"

# 4. No item should have been created.
GET {{supabase_url}}/rest/v1/items?title=eq.Should%20not%20insert&select=id
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$" count == 0
