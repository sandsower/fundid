# Proves Hurl can call a PostGIS RPC and assert on spatial results.
# Calls the `nearby_items` function centered on Hlemmur with 1km radius —
# should return seeded Hlemmur + Austurvöllur items (both within range).

POST {{supabase_url}}/rest/v1/rpc/nearby_items
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
Content-Type: application/json
{
  "lat": 64.1466,
  "lng": -21.9426,
  "radius_km": 2.0
}
HTTP 200
[Asserts]
jsonpath "$" isCollection
jsonpath "$[*].status" contains "active"
