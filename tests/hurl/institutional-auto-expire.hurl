# expire_old_institutional_items RPC: flips old active institutional items to 'expired'.
# Peer-to-peer items are never touched. Dry-run mode only lists candidates without updating.

# 1. Capture the happy-path institution id so we can insert items against it.
GET {{supabase_url}}/rest/v1/institutions?slug=eq.test-inst-happy&select=id
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Captures]
inst_id: jsonpath "$[0].id"

# 2. Insert a 31-day-old institutional item (eligible).
POST {{supabase_url}}/rest/v1/items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
Prefer: return=representation
{
  "type": "found",
  "category": "wallet",
  "title": "Auto-expire old",
  "description": "Backdated 31 days",
  "latitude": 64.1433,
  "longitude": -21.928,
  "location_name": "Test Pool",
  "date_occurred": "2026-03-18",
  "contact_method": "anonymous",
  "contact_value": null,
  "institution_id": "{{inst_id}}",
  "status": "active",
  "created_at": "2026-03-18T00:00:00Z"
}
HTTP 201
[Captures]
old_item: jsonpath "$[0].id"

# 3. Insert a 3-day-old institutional item (should NOT expire).
POST {{supabase_url}}/rest/v1/items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
Prefer: return=representation
{
  "type": "found",
  "category": "keys",
  "title": "Auto-expire recent",
  "description": "Backdated 3 days",
  "latitude": 64.1433,
  "longitude": -21.928,
  "location_name": "Test Pool",
  "date_occurred": "2026-04-15",
  "contact_method": "anonymous",
  "contact_value": null,
  "institution_id": "{{inst_id}}",
  "status": "active",
  "created_at": "2026-04-15T00:00:00Z"
}
HTTP 201
[Captures]
recent_item: jsonpath "$[0].id"

# 4. Insert a 60-day-old peer-to-peer item (must NOT be touched — not institutional).
POST {{supabase_url}}/rest/v1/items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
Prefer: return=representation
{
  "type": "lost",
  "category": "phone",
  "title": "Peer old",
  "description": "Should not expire from institutional cron",
  "latitude": 64.15,
  "longitude": -21.95,
  "location_name": "Miðbær",
  "date_occurred": "2026-02-17",
  "contact_method": "email",
  "contact_value": "peer@example.com",
  "claim_code_hash": "peer-hash-cron",
  "status": "active",
  "created_at": "2026-02-17T00:00:00Z"
}
HTTP 201
[Captures]
peer_item: jsonpath "$[0].id"

# 5. Dry-run: candidates includes old_item, nothing moves.
POST {{supabase_url}}/rest/v1/rpc/expire_old_institutional_items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "p_dry_run": true }
HTTP 200
[Asserts]
jsonpath "$.dry_run" == true
jsonpath "$.items_expired" == 0
jsonpath "$.candidate_count" == 1

GET {{supabase_url}}/rest/v1/items?id=eq.{{old_item}}&select=status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "active"

# 6. Live run: only old_item expires.
POST {{supabase_url}}/rest/v1/rpc/expire_old_institutional_items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "p_dry_run": false }
HTTP 200
[Asserts]
jsonpath "$.dry_run" == false
jsonpath "$.items_expired" == 1

GET {{supabase_url}}/rest/v1/items?id=eq.{{old_item}}&select=status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "expired"

# Recent item stays active.
GET {{supabase_url}}/rest/v1/items?id=eq.{{recent_item}}&select=status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "active"

# Peer-to-peer item stays active.
GET {{supabase_url}}/rest/v1/items?id=eq.{{peer_item}}&select=status
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$[0].status" == "active"

# 7. Second live run: nothing left to expire.
POST {{supabase_url}}/rest/v1/rpc/expire_old_institutional_items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{ "p_dry_run": false }
HTTP 200
[Asserts]
jsonpath "$.items_expired" == 0

# Cleanup
DELETE {{supabase_url}}/rest/v1/items?id=eq.{{old_item}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
DELETE {{supabase_url}}/rest/v1/items?id=eq.{{recent_item}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
DELETE {{supabase_url}}/rest/v1/items?id=eq.{{peer_item}}
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 204
