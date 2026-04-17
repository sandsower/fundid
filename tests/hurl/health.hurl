GET {{base_url}}/api/health
HTTP *
[Asserts]
jsonpath "$.status" exists
jsonpath "$.checks" exists
jsonpath "$.bindings" exists
jsonpath "$.total_ms" isNumber
