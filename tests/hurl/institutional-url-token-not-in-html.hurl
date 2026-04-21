# Regression: scanning the QR poster URL must not serialize the bearer token
# into the rendered page HTML. The server redirects `?t=` away, stashes the
# token in an HttpOnly cookie, and must not return it as page data.

GET {{base_url}}/report/inst?inst=test-inst-happy&t=TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA
[Options]
location: true
HTTP 200
[Asserts]
body not contains "TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA"
