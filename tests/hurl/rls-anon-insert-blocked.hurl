# RLS: anonymous INSERT on public.items must be blocked.
# Guards migration 20250101000008_revoke_anon_insert.sql.
# Writes flow through SvelteKit /api/items with service-role key only.

POST {{supabase_url}}/rest/v1/items
apikey: {{publishable_key}}
Authorization: Bearer {{publishable_key}}
Content-Type: application/json
{
  "type": "lost",
  "category": "phone",
  "title": "Should never persist",
  "latitude": 64.14,
  "longitude": -21.94,
  "location_name": "Anywhere",
  "date_occurred": "2026-01-01",
  "contact_method": "email",
  "contact_value": "rls-test@example.com",
  "claim_code_hash": "rls-test-hash"
}
HTTP *
[Asserts]
status >= 400
status < 500
