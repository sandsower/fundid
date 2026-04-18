# Proves Hurl can hit PostgREST directly with service-role key
# and assert on the items table shape.

GET {{supabase_url}}/rest/v1/items?select=id,title,type,category,status&limit=5
apikey: {{service_role_key}}
Authorization: Bearer {{service_role_key}}
HTTP 200
[Asserts]
jsonpath "$" isCollection
