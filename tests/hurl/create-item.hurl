# End-to-end: SvelteKit /api/items → Turnstile (test key) → Supabase insert.
# Then verifies the row landed via PostgREST. Cleans up at the end.

POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "type": "lost",
  "category": "keys",
  "title": "Hurl spec lyklar",
  "description": "Inserted by create-item.hurl",
  "latitude": 64.1466,
  "longitude": -21.9426,
  "location_name": "Hlemmur",
  "date_occurred": "2026-04-16",
  "contact_value": "hurl@test.is"
}
HTTP 200
[Captures]
new_id: jsonpath "$.id"

GET {{supabase_url}}/rest/v1/items?id=eq.{{new_id}}&select=id,title,type,category,status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].title" == "Hurl spec lyklar"
jsonpath "$[0].type" == "lost"
jsonpath "$[0].category" == "keys"
jsonpath "$[0].status" == "active"

DELETE {{supabase_url}}/rest/v1/items?id=eq.{{new_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
