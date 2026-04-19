# Regression: routes whose URL embeds bearer credentials must respond with
# Referrer-Policy: no-referrer so fonts, Turnstile, and analytics requests
# can't leak the token in the Referer header.

# Valid institutional report URL.
GET {{base_url}}/report/inst?inst=test-inst-happy&t=TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA
HTTP *
[Asserts]
header "Referrer-Policy" == "no-referrer"

# Audit kill-switch URL.
GET {{base_url}}/i/test-inst-happy/audit-happy-aaaaaaaaaaaaaaaaaaaaaaaa
HTTP *
[Asserts]
header "Referrer-Policy" == "no-referrer"

# Non-credential page keeps the default.
GET {{base_url}}/
HTTP 200
[Asserts]
header "Referrer-Policy" == "strict-origin-when-cross-origin"
