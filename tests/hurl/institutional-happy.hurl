# End-to-end: /api/items institutional path with a valid QR token.
# Seed includes institution 'test-inst-happy' with SHA-256(token) stored.

POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-happy",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "wallet",
  "title": "Happy path veski",
  "description": "Inserted by institutional-happy.hurl"
}
HTTP 200
[Captures]
new_id: jsonpath "$.id"
[Asserts]
jsonpath "$.institutional" == true

# Row has institution_id, anonymous contact, no claim code, location = institution name,
# coordinates pulled from institution, type forced to 'found'.
GET {{supabase_url}}/rest/v1/items?id=eq.{{new_id}}&select=id,title,type,category,status,contact_method,contact_value,claim_code_hash,institution_id,location_name,latitude,longitude
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].title" == "Happy path veski"
jsonpath "$[0].type" == "found"
jsonpath "$[0].category" == "wallet"
jsonpath "$[0].status" == "active"
jsonpath "$[0].contact_method" == "anonymous"
jsonpath "$[0].contact_value" == null
jsonpath "$[0].claim_code_hash" == null
jsonpath "$[0].location_name" == "Test Pool"
jsonpath "$[0].latitude" == 64.1433
jsonpath "$[0].longitude" == -21.928
jsonpath "$[0].institution_id" exists

DELETE {{supabase_url}}/rest/v1/items?id=eq.{{new_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
