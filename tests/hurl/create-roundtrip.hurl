# Proves capture + cross-request state works.
# Inserts an item via PostgREST, captures the generated id, reads it back.

POST {{supabase_url}}/rest/v1/items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
Prefer: return=representation
{
  "type": "found",
  "category": "wallet",
  "title": "Brúnt leðurveski",
  "description": "Fannst á Laugavegi",
  "latitude": 64.1450,
  "longitude": -21.9300,
  "location_name": "Laugavegur 22",
  "date_occurred": "2026-04-16",
  "contact_method": "email",
  "contact_value": "hurl-test@example.com",
  "claim_code_hash": "hurl-roundtrip-hash"
}
HTTP 201
[Captures]
new_id: jsonpath "$[0].id"

GET {{supabase_url}}/rest/v1/items?id=eq.{{new_id}}&select=id,title,category,status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].title" == "Brúnt leðurveski"
jsonpath "$[0].category" == "wallet"
jsonpath "$[0].status" == "active"

DELETE {{supabase_url}}/rest/v1/items?id=eq.{{new_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
