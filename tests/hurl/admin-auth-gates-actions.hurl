# Regression: admin form actions must require admin_session — not just GETs.
# Previously the guard lived in +layout.server.ts which only runs on page
# renders, leaving form actions reachable without auth.

# Count institutions before the attack.
GET {{supabase_url}}/rest/v1/institutions?select=id
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Captures]
before_count: jsonpath "$" count

# Attempt to create an institution without an admin_session cookie.
# SvelteKit wraps redirects from form actions as a JSON envelope when the
# request looks like a programmatic POST; the envelope is what matters —
# the guard must reject before reaching the service-role handler.
POST {{base_url}}/admin/institutions?/create
Content-Type: application/x-www-form-urlencoded
[FormParams]
slug: unauth-test
name: Unauthorized
address: Nowhere 1
latitude: 64.14
longitude: -21.94
contact_email: unauth@example.com
rate_limit_per_day: 20
HTTP *
[Asserts]
jsonpath "$.type" == "redirect"
jsonpath "$.location" contains "/admin/login"

# No row should have been inserted.
GET {{supabase_url}}/rest/v1/institutions?slug=eq.unauth-test&select=id
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$" count == 0
