# resolve_item: 5 wrong-hash attempts per hour lock out even the correct hash.
# Guards security-hardening migration 20250101000002.
# Requires a clean resolve_attempts table — run reset.sh before this spec.

# Pick the active item with the known claim_code_hash.
GET {{supabase_url}}/rest/v1/items?select=id&claim_code_hash=eq.seed-hash-2
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Captures]
item_id: jsonpath "$[0].id"

# Five wrong attempts — all return false, all get logged.
POST {{supabase_url}}/rest/v1/rpc/resolve_item
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "item_id": "{{item_id}}", "code_hash": "wrong-1" }
HTTP 200
[Asserts]
body == "false"

POST {{supabase_url}}/rest/v1/rpc/resolve_item
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "item_id": "{{item_id}}", "code_hash": "wrong-2" }
HTTP 200
[Asserts]
body == "false"

POST {{supabase_url}}/rest/v1/rpc/resolve_item
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "item_id": "{{item_id}}", "code_hash": "wrong-3" }
HTTP 200
[Asserts]
body == "false"

POST {{supabase_url}}/rest/v1/rpc/resolve_item
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "item_id": "{{item_id}}", "code_hash": "wrong-4" }
HTTP 200
[Asserts]
body == "false"

POST {{supabase_url}}/rest/v1/rpc/resolve_item
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "item_id": "{{item_id}}", "code_hash": "wrong-5" }
HTTP 200
[Asserts]
body == "false"

# Sixth call uses the CORRECT hash — rate limit blocks it anyway.
POST {{supabase_url}}/rest/v1/rpc/resolve_item
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "item_id": "{{item_id}}", "code_hash": "seed-hash-2" }
HTTP 200
[Asserts]
body == "false"

# Item must remain active — not resolved — because the rate limit took effect.
GET {{supabase_url}}/rest/v1/items?select=status&id=eq.{{item_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "active"
