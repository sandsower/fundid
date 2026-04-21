# Institution audit-URL kill-switch: expire an item using (slug, audit_slug).
# Creates an institutional item via the real submission path, then expires it.

# 1. Submit an institutional item via /api/items.
POST {{base_url}}/api/items
Content-Type: application/json
{
  "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  "inst": "test-inst-happy",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "wallet",
  "title": "Audit expire target",
  "description": "Created by institutional-audit-expire"
}
HTTP 200
[Captures]
item_id: jsonpath "$.id"

# 2. Wrong audit slug → 403, item remains active.
POST {{base_url}}/api/institution/expire
Content-Type: application/json
{
  "slug": "test-inst-happy",
  "audit_slug": "wrong-audit-slug-zzzzzzzzzzzzzzzzzzzzzzz",
  "item_id": "{{item_id}}"
}
HTTP 403
[Asserts]
jsonpath "$.error" == "unauthorized"

GET {{supabase_url}}/rest/v1/items?id=eq.{{item_id}}&select=status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "active"

# 3. Valid audit slug → 200, item becomes expired.
POST {{base_url}}/api/institution/expire
Content-Type: application/json
{
  "slug": "test-inst-happy",
  "audit_slug": "audit-happy-aaaaaaaaaaaaaaaaaaaaaaaa",
  "item_id": "{{item_id}}"
}
HTTP 200
[Asserts]
jsonpath "$.success" == true

GET {{supabase_url}}/rest/v1/items?id=eq.{{item_id}}&select=status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "expired"

# 4. Second call on already-expired → 404 (no rows updated).
POST {{base_url}}/api/institution/expire
Content-Type: application/json
{
  "slug": "test-inst-happy",
  "audit_slug": "audit-happy-aaaaaaaaaaaaaaaaaaaaaaaa",
  "item_id": "{{item_id}}"
}
HTTP 404
[Asserts]
jsonpath "$.error" == "not_found"

# 5. Cross-institution attempt: slug B's audit tries to expire slug A's item → 404.
POST {{base_url}}/api/institution/expire
Content-Type: application/json
{
  "slug": "test-inst-rate",
  "audit_slug": "audit-rate-bbbbbbbbbbbbbbbbbbbbbbbbb",
  "item_id": "{{item_id}}"
}
HTTP 404
[Asserts]
jsonpath "$.error" == "not_found"

DELETE {{supabase_url}}/rest/v1/items?id=eq.{{item_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
