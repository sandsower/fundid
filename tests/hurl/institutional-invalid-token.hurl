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

# 4. Pets are excluded from institutional submissions — they need pet_details
# and belong on the dyr flow.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-happy",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "pet",
  "title": "Institutional pet should reject"
}
HTTP 400
[Asserts]
jsonpath "$.error" == "invalid_category"

# 5. External image URLs are rejected — the audit page renders images and an
# external URL could leak the bearer audit_slug via Referer.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-happy",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "keys",
  "title": "External image should reject",
  "image_url": "https://evil.example.com/tracker.png"
}
HTTP 400
[Asserts]
jsonpath "$.error" == "invalid_image_url"

# 6. No item should have been created from any of the above attempts.
GET {{supabase_url}}/rest/v1/items?or=(title.eq.Should%20not%20insert,title.eq.Institutional%20pet%20should%20reject,title.eq.External%20image%20should%20reject)&select=id
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$" count == 0
