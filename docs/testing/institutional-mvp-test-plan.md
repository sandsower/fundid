# Institutional MVP — local test plan

Pre-ship verification for the institutional lost-and-found flow. Shipping targets
weekend deploy + Monday outreach. Run this plan end-to-end on a clean local stack
before tagging `v1.8.0`.

## Pre-flight

```
supabase start               # ~30s warm boot
supabase db reset --local    # apply migrations + seed including test institutions
pnpm dev                     # vite on :5173
```

Confirm:
- `supabase status` shows running (studio at 54323, API at 54321)
- `http://localhost:5173/` loads with mock + seed items on the map
- `supabase db diff --schema public` returns nothing (schema matches migrations)

## Automated coverage (Hurl)

```
tests/hurl/reset.sh
hurl --test --variables-file tests/hurl/.vars.local tests/hurl/*.hurl
```

Expect: **14 specs green in ~200ms**. Four are new for the institutional flow:

| Spec | Covers |
|---|---|
| `institutional-happy.hurl` | Valid token → item lands with `institution_id`, `contact_method='anonymous'`, no claim code, location forced to institution |
| `institutional-invalid-token.hurl` | Wrong token → 403; unknown slug → 403; missing title → 400; no rows created |
| `institutional-rate-limit.hurl` | `rate_limit_per_day=2` institution → 3rd submission returns 429, count stays at 2 |
| `institutional-audit-expire.hurl` | Audit-URL kill-switch: wrong audit_slug → 403; valid → 200 + status='expired'; replay → 404; cross-institution → 404 |
| `institutional-auto-expire.hurl` | Cron RPC dry-run lists candidates without mutating; live run expires items ≥ 30 days old; peer-to-peer items untouched; recent items untouched |

Pre-existing specs (create-item, claim-code-redemption, resolve-rate-limit, etc.)
must also stay green — they cover the peer-to-peer regression surface.

## Manual coverage (browser)

### M1 — Institutional submission via QR URL

Seed includes `test-inst-happy` with the token `TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA`.

1. Open `http://localhost:5173/report/inst?inst=test-inst-happy&t=TESTTOKENHAPPYAAAAAAAAAAAAAAAAAA`
2. Expect: header reads **Test Pool**, subtitle "Skráning hjá"
3. Pick a category (NOT pet — pet category should be absent from the grid)
4. Upload a photo from your phone/filesystem
5. Title: e.g., "Brúnt veski"
6. Description: optional
7. Complete Turnstile (invisible widget), submit
8. Expect: success screen "Skráning móttekin" with an "add another item" button
9. Tap "add another" → form resets, ready for next submission

Then verify on the main site:
10. Open `http://localhost:5173/`
11. The new item appears as a **building-glyph pin** (amber color, not red/green) at the seeded institution coordinates (≈ Sundhöllin)
12. Click the pin → preview modal shows **"Afhentur hjá óskilamunum Test Pool"** instead of a MapPin line
13. No **"Contact finder"** button visible — only "View full details"
14. Click "View full details" → detail page shows an institutional block: address + phone (411 5300) + weekly hours + claim instructions
15. Verify the phone number is a tappable `tel:` link
16. Confirm there is **no contact relay button and no "Mark as returned"** button
17. Confirm the standalone map of the item's coordinates is **not** rendered (it would duplicate the institution pin)

### M2 — Wrong / expired token

1. Open `http://localhost:5173/report/inst?inst=test-inst-happy&t=WRONGXXXXX` → expect 404 page
2. Open `http://localhost:5173/report/inst?inst=does-not-exist&t=anything` → expect 404

### M3 — Audit page + kill-switch

1. Open `http://localhost:5173/i/test-inst-happy/audit-happy-aaaaaaaaaaaaaaaaaaaaaaaa`
2. Expect: header "Test Pool", explanation card, list of submitted items under **Active**
3. Verify submission limit text "Daily submission limit: 20"
4. Pick an item, tap **Remove**
5. Expect: item disappears from Active, shows under "Removed / expired" grayed out
6. Refresh page → state persists (status actually updated in DB)
7. Visit `http://localhost:5173/i/test-inst-happy/wrong-slug` → 404

### M4 — Rate limit UX

`test-inst-rate` has `rate_limit_per_day=2`.

1. Submit via `/report/inst?inst=test-inst-rate&t=TESTTOKENRATEBBBBBBBBBBBBBBBBBBBB` — success
2. Submit again — success
3. Submit third time — user-visible error banner shows "Too many submissions" / "Of mörg..."

### M5 — Admin institution creation

1. Navigate to `http://localhost:5173/admin/login`, log in with `ADMIN_PASSWORD` from `.env.local`
2. Go to `http://localhost:5173/admin/institutions`
3. Expect: list of 2 seeded institutions (test-inst-happy, test-inst-rate) and a "New institution" form
4. Create a new institution with:
   - slug: `manual-test`
   - name: `Manual Test`
   - address: `Miðbær 1, 101 Reykjavík`
   - lat: `64.1466`, lng: `-21.9426`
   - phone: `555 0000`
   - contact email: `test@example.com`
   - rate limit: 20
   - hours: leave preset JSON
5. Expect: success banner with a plaintext token, QR URL, audit URL
6. **Copy the token immediately — it will not be displayed again**
7. Click "Print" — poster page opens in a new tab
8. Expect: A4 layout, QR code roughly 120mm, Icelandic heading "Skannaðu til að skrá", institution name rendered, 3-step instruction list
9. Print preview (⌘/Ctrl + P) → layout fits on one A4 page, no scroll

### M6 — Poster QR round-trip

1. With the poster rendered, scan the QR with a phone camera
2. Expect: phone opens the `/report/inst?inst=manual-test&t=...` URL
3. Submit a test item from the phone
4. Verify on the desktop map that the item appears at Miðbær coordinates with the building-glyph pin

### M7 — Peer-to-peer regression

1. Open home page, click **"I lost something"** / **"Ég týndi einhverju"**
2. Submit via the existing ReportForm (type, category, title, location, email, photo)
3. Expect: claim code email sent (visible in supabase inbucket if enabled, or check DB)
4. Expect: item lands on map with standard red/green pin, MapPin icon on card
5. Open the item detail page → "Contact finder" and "Mark as returned" buttons both visible
6. Use a claim code to redeem via ResolveModal → status flips to resolved

### M8 — Cross-flow coexistence

1. With institutional and peer-to-peer items both in the DB, verify the map renders both pin styles side-by-side
2. Filter by category — both types respect the filter
3. Toggle to list view — both render in the list
4. Search across titles — both types searchable

## Ship gates

Before tagging `v1.8.0`:

- [ ] `pnpm check` returns 0 errors
- [ ] Full Hurl suite green after `reset.sh`
- [ ] M1–M8 manual paths pass in Chrome + Safari (iOS if possible, for the submission flow)
- [ ] `vars.INSTITUTIONAL_EXPIRE_DRY_RUN` is explicitly set to `"true"` or `"false"` in GitHub Actions variables. The worker fails closed (skips expiry) on any other value — there is no code-level default; the Actions variable is the source of truth. Initial deploy should set it to `"true"`; flip to `"false"` after 1–2 observed cron runs.
- [ ] No uncommitted files outside the institutional MVP surface
- [ ] Memento design note still accurate: `memento/notes/fundid-institutional-lost-found-mvp-design.md`

## Post-deploy smoke (prod)

After pushing the tag:

1. `https://fundid.is/` loads, map renders peer-to-peer items as before
2. Create the first real partner via `/admin/institutions` (e.g., Sundhöllin if they agree)
3. Print the A4 poster, scan the QR with a phone, verify `/report/inst` loads on prod
4. Submit one test item → verify pin shows at the institution on prod
5. Visit audit URL → verify item listed, remove it → verify removal
6. **Do not let auto-expire cron run live for 7 days** — watch Cloudflare worker logs for the dry-run output first

## Rollback

If institutional flow breaks prod:
- Migration is additive (nullable FK + new tables); no rollback needed
- Revert the code commit, redeploy previous tag — the `institutions` table and FK stay harmless
- If a submitted item looks bad, expire it via the audit URL (no admin SSH needed)
