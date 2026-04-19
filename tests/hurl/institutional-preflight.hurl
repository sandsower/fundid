# Regression: preflight endpoint must reject rate-limited/invalid submissions
# before the client uploads an image and orphans an R2 object.

# 1. Missing slug.
POST {{base_url}}/api/institution/preflight
Content-Type: application/json
{ "category": "keys" }
HTTP 400
[Asserts]
jsonpath "$.error" == "invalid_institution"

# 2. Category rejected (pet isn't allowed institutionally).
POST {{base_url}}/api/institution/preflight
Content-Type: application/json
{
  "inst": "test-inst-happy",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "pet"
}
HTTP 400
[Asserts]
jsonpath "$.error" == "invalid_category"

# 3. Wrong token.
POST {{base_url}}/api/institution/preflight
Content-Type: application/json
{
  "inst": "test-inst-happy",
  "t": "WRONGTOKENZZZZZZZZZZZZZZZZZZZZZZ",
  "category": "keys"
}
HTTP 403
[Asserts]
jsonpath "$.error" == "invalid_institution"

# 4. Valid preflight passes.
POST {{base_url}}/api/institution/preflight
Content-Type: application/json
{
  "inst": "test-inst-happy",
  "t": "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA",
  "category": "keys"
}
HTTP 200
[Asserts]
jsonpath "$.ok" == true
