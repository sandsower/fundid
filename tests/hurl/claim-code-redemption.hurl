# Claim-code redemption happy path via resolve_item RPC.
# Assumes reset.sh ran first: seed has an active item with claim_code_hash = 'seed-hash-1'.

# 1. Find the active seeded item with the known hash.
GET {{supabase_url}}/rest/v1/items?select=id,status&claim_code_hash=eq.seed-hash-1
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Captures]
item_id: jsonpath "$[0].id"
[Asserts]
jsonpath "$[0].status" == "active"

# 2. Call the resolve_item RPC with matching hash.
POST {{supabase_url}}/rest/v1/rpc/resolve_item
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{
  "item_id": "{{item_id}}",
  "code_hash": "seed-hash-1"
}
HTTP 200
[Asserts]
body == "true"

# 3. Verify status flipped to resolved.
GET {{supabase_url}}/rest/v1/items?select=status&id=eq.{{item_id}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "resolved"
