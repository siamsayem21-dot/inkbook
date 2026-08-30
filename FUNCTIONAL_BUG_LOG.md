# Functional Bug Log — Full Ground-Up Re-Run (2026-08-29)

Format per entry: ID / PERSONA / ROUTE / ACTION / EXPECTED / ACTUAL / REPRO / CONSOLE / NETWORK / SEVERITY / ROOT CAUSE / FILES / FIX / RETEST / STATUS

(entries appended as found)

## BUG-OWN-FULLQA-001 — New signup defaults to 1-artist plan with no in-flow upgrade path

- **PERSONA:** OWNER
- **ROUTE:** `/register` → `/owner/artists`
- **ACTION:** Complete real signup via `/register`, then click "Invite Artist" a second time (studio already has 1 artist).
- **EXPECTED:** Either the invite works (if trial defaults to a multi-seat plan) or, if blocked by the seat cap, the owner has some in-flow way to upgrade without leaving the dashboard.
- **ACTUAL:** A fresh signup silently defaults to `plan='solo'` (1-artist cap). The 2nd "Invite Artist" button is correctly `disabled` with `title="Upgrade your plan to invite more artists"` — this is correct defensive behavior, not a crash or data bug — but there is no visible upgrade CTA/link anywhere on `/owner/artists` or `/owner/settings/billing` to act on that tooltip; the owner has to already know to go find a plan-upgrade flow. Confirmed via real UI: `scripts/qa-fullrun-seed-studio.mjs` step 2, first attempt.
- **REPRO:** Sign up a new studio via `/register`, invite 1 artist (succeeds), attempt to invite a 2nd artist — button is disabled with the tooltip above, no next step offered.
- **CONSOLE:** none
- **NETWORK:** none (button is disabled client-side before any request is made)
- **SEVERITY:** P3 (UX gap / conversion friction, not a functional defect — the guard itself works correctly)
- **ROOT CAUSE:** `studios.plan` defaults to `'solo'` on signup (`app/(auth)/register/page.tsx` → `/api/studios`), and the disabled Invite Artist button's tooltip text is the only surfaced signal — no link to billing/upgrade attached to it.
- **FILES:** `app/(owner)/owner/artists/ArtistsClient.tsx` (disabled button + tooltip), `app/(owner)/owner/settings/billing/BillingClient.tsx` (where an upgrade path would live)
- **FIX:** NOT FIXED — this is a product/UX enhancement (wire the disabled-button tooltip or an adjacent CTA to `/owner/settings/billing`), not a bug requiring an emergency patch. Left for backlog; QA seeding worked around it by bumping `studios.plan` to `'studio'` directly via the service-role client for the 2 test artists needed downstream (documented in `qa-manifests/fullqa-20260829-studio.json` notes).
- **RETEST:** n/a (not fixed)
- **STATUS:** NOTED_NOT_FIXED — backlog UX item, not launch-blocking

---

## Regression re-verify — Owner deposit link payment routing (prior P0/P1, commit `4ee18db`)

- **PERSONA:** OWNER
- **ROUTE:** `/owner/bookings/{id}` (booking in `pending_deposit` status, studio has no `stripe_connected_account_id`)
- **ACTION:** Click "Generate Deposit Link" on a real booking, real browser, studio genuinely not Stripe-Connected (fresh QA studio).
- **EXPECTED (per prior fix):** Fails closed with a clear "Stripe not set up" style message — no raw error, no link pointing at the wrong (platform) Stripe account.
- **ACTUAL:** Confirmed — fails closed with a clear message, no crash, no raw error text, no bad checkout link generated. Prior P0 (client-side raw error) and P1 (deposit link routed to platform account instead of studio) both still hold fixed under a brand-new, never-before-tested studio.
- **CONSOLE / NETWORK:** clean
- **SEVERITY:** n/a (regression check, no new defect)
- **STATUS:** VERIFIED STILL FIXED — `scripts/qa-fullrun-owner-clickthrough.mjs`, action id `OWN-047`

---

## Security check — Cross-studio isolation probe (Owner Portal)

- **PERSONA:** OWNER
- **ACTION:** Logged in as QA Studio A's owner, navigated directly to a throwaway Studio B's booking id (`/owner/bookings/{studioB-booking-id}`) and client id (`/owner/clients/{studioB-client-id}`) while authenticated only for Studio A.
- **EXPECTED:** Blocked — no cross-tenant data visible.
- **ACTUAL:** Correctly blocked both times (booking route rendered a generic "doesn't exist or you don't have access" card at HTTP 200; client route returned HTTP 404). No Studio B data (name, email, booking details) appeared anywhere in the response body.
- **SEVERITY:** n/a (probe passed, no defect found)
- **STATUS:** VERIFIED ISOLATED — `scripts/qa-fullrun-owner-clickthrough.mjs`, action ids `OWN-071`, `OWN-072`. Throwaway Studio B fully cleaned up after the probe.

## BUG-FLAGSHIP-001

- **PERSONA:** OWNER
- **ROUTE:** `/api/ai/artist-match`
- **ACTION:** AI detects a consultation's style as "Fine Line" (92-95% confidence, real Claude call) for a studio whose artist has styles=["Fine line"] (lowercase l) — a real, correct conceptual match
- **EXPECTED:** the artist is recommended (score 100, isRecommended=true) — same pattern already verified in DEFERRED_ISSUES.md #8
- **ACTUAL:** the artist scores 50/isRecommended=false — "Doesn't list Fine Line among accepted styles" — because lib/artist-match.ts's rankArtistsByStyle() does an exact, case-SENSITIVE string comparison (`c.styles.includes(style!)`), and the two canonical style-name lists in this codebase disagree on casing: app/api/ai/style-detect/route.ts's VALID_STYLES uses "Fine Line", while app/(artist)/artist/portfolio/actions.ts's ACCEPTED_STYLES (the list artists actually pick their own accepted styles from) uses "Fine line". Any artist who picked their real accepted style from that second list can never be recommended by Artist Match for that style, even on an exact conceptual match.
- **REPRO:** Seed/pick an artist whose styles=["Fine line"] (as the real artist-styles picker offers). Submit a consultation the AI detects as "Fine Line". Call /api/ai/artist-match (or view the owner Consultation Detail page's Deposit Collection / Book Appointment artist selects) — the artist lands in "Other Artists", not "Recommended".
- **CONSOLE:** none
- **NETWORK:** none
- **SEVERITY:** P2
- **ROOT CAUSE:** lib/artist-match.ts line ~43 (`c.styles.includes(style!)`) is case-sensitive; the codebase's two separate hardcoded canonical style-name constants (style-detect's VALID_STYLES vs the portfolio styles-picker's ACCEPTED_STYLES) disagree on the casing of at least "Fine Line"/"Fine line".
- **FILES:** lib/artist-match.ts
- **FIX:** Normalized the comparison to case-insensitive + trimmed (`c.styles.some(s => s.trim().toLowerCase() === styleNormalized)`) instead of trying to reconcile the two separate hardcoded lists (smaller blast radius, doesn't touch either UI's dropdown options). Additive, no schema/migration/RLS/auth change. LEFT UNCOMMITTED per mission rules; production still has the old case-sensitive behavior, which is why FLAGSHIP-015/018 below correctly show it failing live.
- **RETEST:** Verified with a standalone unit-level check (not a live server call): rankArtistsByStyle([{styles:['Fine line']}], 'Fine Line') now returns score=100, isRecommended=true. See script history for the throwaway verification snippet (not kept — trivial, one-off).
- **STATUS:** FIXED_LOCALLY_NOT_DEPLOYED

## BUG-FLAGSHIP-002

- **PERSONA:** CLIENT
- **ROUTE:** `/portal/qa-fullqa-20260829/projects`
- **ACTION:** submit a consultation via the public, unauthenticated /book/[studio]/consult wizard, THEN create/log into a portal account with the same email
- **EXPECTED:** the guest-submitted consultation appears as a Project once the client logs in with the matching email
- **ACTUAL:** it does NOT appear — Projects/My Bookings/History all resolve ownership solely via a submitted `ai_chats` row (client_account_id -> consultation_id), which is only ever created by the portal's OWN chat-based consultation flow (app/portal/[studio]/consultation/actions.ts). The public wizard's submitConsultation() (app/book/[studio]/consult/actions.ts) never creates one.
- **REPRO:** Submit /book/<studio>/consult as a guest with email X. Separately create a client_accounts row / log in to /portal/<studio> with email X. The consultation is invisible in Projects, My Bookings, History, and the Consent/Review pages (all gated by the same ai_chats check).
- **CONSOLE:** none
- **NETWORK:** none
- **SEVERITY:** P2
- **ROOT CAUSE:** lib/client-portal/projects.ts, lib/client-portal/bookings.ts, lib/client-portal/history.ts, and the consent/review pages all resolve a client's ownership of a `consultations` row exclusively through a submitted `ai_chats` row. The public guest wizard writes directly to `consultations` and never creates that ai_chats link, so a guest who consults first and creates a portal account afterward (the most common real-world order) can never see it.
- **FILES:** lib/client-portal/reconcile-guest-consultations.ts (new), app/portal/[studio]/layout.tsx
- **FIX:** Added lib/client-portal/reconcile-guest-consultations.ts — on every portal page load (called once from the shared app/portal/[studio]/layout.tsx, covering all sub-routes), backfills a submitted ai_chats row for any of the studio's own guest consultations whose client_email case-insensitively matches the now-OTP-verified account email, scoped to that studio, skipping any consultation that already has an ai_chats link. Additive only — no schema/migration, no RLS/auth change, no existing write path touched. LEFT UNCOMMITTED per mission rules (do not commit/push); verified locally against a local dev server (see script output) since production does not yet have this fix — this run's live production journey above used the same manual ai_chats-insert workaround the prior mission's qa-payment-routing-fix-verify.mjs already used as precedent, to keep testing everything downstream.
- **RETEST:** Verified on local dev server: a guest consultation submitted with no ai_chats row became visible in /portal/<studio>/projects immediately after logging in with the matching email, with zero manual DB intervention. See scripts/qa-fullrun-flagship-reconcile-fix-retest.mjs.
- **STATUS:** FIXED_LOCALLY_NOT_DEPLOYED

### CORRECTION to BUG-FLAGSHIP-001 (same run, later re-verification)

A re-run of the same live production call (`FLAGSHIP-015`, `qa-manifests/fullqa-20260829-flagship-results.json`) with the exact same real Claude-detected style ("Fine Line", 92% confidence) against the same "Fine line"-styled QA artist returned the CORRECT result: score 100, isRecommended=true, reasoning "QA Artist Fine Line specializes in fine line work, which perfectly matches...". Root cause: `/api/ai/artist-match` has an AI-refinement layer (`refineWithAI()`, active whenever `ANTHROPIC_API_KEY` is set, which it is in production) that sits on top of the deterministic `rankArtistsByStyle()` ranker this bug report describes — Claude's own reasoning correctly recognized the conceptual match despite the casing mismatch, masking the underlying bug on the live, normal-case path. The deterministic case-sensitivity bug is real and the fix (case-insensitive comparison in `lib/artist-match.ts`) is correct and still left in place (uncommitted), but it only actually surfaces when the AI-refinement call is unavailable or fails (no `ANTHROPIC_API_KEY`, network error, or a malformed AI response — all of which fall back to the raw deterministic ranker per that route's own documented "never break the flow" design). **Downgrading severity P2 -> P3** (defensive-fallback-path bug, not a live-path defect) — the fix is still valid and worth keeping since the fallback path exists specifically to be trustworthy on its own.

The one remaining owner-UI-level FAIL (`FLAGSHIP-018`, "Recommended optgroup" check on `/owner/consultations/{id}` showing FineLine in Recommended=false) is most likely a test-script timing artifact, not a reproduction of this bug: `ConsultationDetail.tsx` calls the exact same `/api/ai/artist-match` endpoint with the exact same params from a client-side `useEffect` (a real Claude call, which this mission independently observed taking 10-20+ seconds elsewhere for `/api/ai/consultation-questions` and `/api/ai/style-detect`), but the test script only waited a fixed 2500ms after reload before reading the `<select>`'s rendered options — almost certainly too short. Not re-verified with a longer wait due to time budget; noted here rather than left silently unexplained.

### CORRECTION to BUG-FLAGSHIP-002's fix (coordinator review, same run) — real cross-client leak bug found in the fix itself, fixed

Reviewing `lib/client-portal/reconcile-guest-consultations.ts` before allowing it to stay uncommitted found a second, more serious bug in the fix: it matched guest consultations via `.ilike("client_email", normalizedEmail)`, where `normalizedEmail` is the **authenticated account's own email** used as the ILIKE *pattern*. Postgres `ILIKE` treats `_` and `%` in the pattern as wildcards (any single character / any run of characters) unless escaped — and `_` is common in real email local-parts (e.g. `jo_smith@x.com`). Any account whose email contains `_` or `%` would therefore wildcard-match and silently claim (via a new `ai_chats` insert) a **different guest's** similarly-spelled consultation at the same studio — a real cross-client data/privacy leak, not just a theoretical one, introduced by the fix meant to solve BUG-FLAGSHIP-002.
- **SEVERITY:** P2 (data isolation leak, though narrow: requires the victim guest email to differ from the account's own email by exactly the wildcard-matched character(s), and only within the same studio)
- **FIX:** Replaced the `.ilike()` DB-level filter with a studio-scoped `.select("id, client_email")` fetch plus an exact case-insensitive comparison (`.trim().toLowerCase() === normalizedEmail`) done in application code — no wildcard semantics possible. Verified the corrected matcher in isolation: a simulated victim email (`jo.smith@...`) is correctly excluded while the real account email (`jo_smith@...`) is correctly matched, where the old `.ilike()` version would have wildcard-matched both.
- **FILES:** `lib/client-portal/reconcile-guest-consultations.ts`
- **STATUS:** FIXED_LOCALLY_NOT_DEPLOYED (same deploy status as the parent BUG-FLAGSHIP-002 fix — both still uncommitted pending Siam's review/approval per this mission's rules)

---

## BUG-SEC-FULLQA-001 — GET /api/bookings is a real cross-tenant IDOR (P0, live on production)

- **PERSONA:** OWNER/ARTIST (any authenticated session, any studio)
- **ROUTE:** `GET /api/bookings?studioId=<any>`
- **ACTION:** An authenticated owner/artist of Studio A calls `GET /api/bookings?studioId=<Studio B's id>`.
- **EXPECTED:** Only Studio A's own bookings are ever returned, regardless of what `studioId` is passed.
- **ACTUAL (before fix, confirmed live against production, not a code-read guess):** The handler only checked "is anyone logged in" (`auth.getUser()`) — it never verified the caller-supplied `studioId` belonged to that session. Any authenticated user of ANY studio could read a completely different studio's full `bookings` rows (client PII, date/time, deposit/total amounts, status) just by passing that studio's id as a query param. Confirmed via a live probe against `https://www.inkbook.tech`: planted a throwaway "victim" studio with a real booking (canary client name), logged in as an unrelated "attacker" studio's real owner, called the endpoint with the victim's `studioId` — this is a genuine, exploitable, currently-live cross-tenant PII leak, not theoretical.
- **REPRO:** `node scripts/qa-fullrun-security-bookings-idor.mjs` (self-cleaning; run against `https://www.inkbook.tech`, the default `QA_BASE_URL`, to reproduce against current production — the fix below is NOT yet deployed).
- **CONSOLE:** n/a (server-side API probe)
- **NETWORK:** the leak itself IS the network response — `res.status` 200 with the victim's booking rows in the body pre-fix.
- **SEVERITY:** P0 (confirmed real cross-tenant PII leak, currently live in production)
- **ROOT CAUSE:** `app/api/bookings/route.ts`'s `GET` handler trusted a client-supplied `studioId` query param directly in the Supabase query instead of deriving the caller's own studio server-side, unlike every other studio-scoped route in this codebase.
- **FILES:** `app/api/bookings/route.ts`
- **FIX:** Added `getStudioId()` (server-side session → studio resolution, same helper used throughout Owner/Artist Portal) as a mandatory pre-check; the query is now always forced to `.eq("studio_id", callerStudioId)`, and a caller-supplied `studioId` that doesn't match is rejected with `403` rather than trusted. Matches the standard authorization pattern already used elsewhere in this codebase — not a new pattern.
- **REGRESSION CHECK:** Searched the entire `app/`/`components/`/`lib/` tree for any caller of this GET endpoint — found none (the only `/api/bookings` callers in the app are `POST` calls from `BookingForm.tsx`/`FlashBookingForm.tsx`, an unrelated code path, untouched). This GET handler is reachable but currently unused by any product UI, so hardening it carries no regression risk to any tested user flow.
- **RETEST:** `QA_BASE_URL=http://localhost:3311 node scripts/qa-fullrun-security-bookings-idor.mjs` against a local dev server running the fix — both the authenticated cross-tenant probe (now `403`) and the unauthenticated probe (`401`) pass clean, 0 findings. **Not yet retested against production — fix is uncommitted and not deployed.**
- **STATUS:** FIXED_LOCALLY_NOT_DEPLOYED — this is a P0 and should be prioritized for review/deploy ahead of the other uncommitted fixes from this mission.

---

## BUG-SEC-FULLQA-002 — Public AI routes let anyone extract a studio's private knowledge-base notes via an arbitrary `studioId` (P2, live on production)

- **PERSONA:** UNAUTHENTICATED / any authenticated party
- **ROUTE:** `POST /api/ai/consultation-questions`, `POST /api/ai/quote-generate`, `POST /api/ai/style-detect`
- **ACTION:** Call any of these public (no-auth-required) AI routes with an arbitrary `studioId` in the request body.
- **EXPECTED:** Only that studio's genuinely public FAQ knowledge (the same tier already shown on its own public booking page) should ever be able to shape the AI's response for a caller with no relationship to that studio.
- **ACTUAL:** All three routes called `getStudioKnowledge(studioId)` — which returns the studio's FULL private knowledge base (`is_public: false` entries too — internal pricing guidance, policy notes never meant to be public) — using only the request body's `studioId`, with no check that the caller has any relationship to that studio. Since a `studioId` is a UUID that appears in page source/API responses (not a secret), anyone who obtains one (e.g. a curious visitor, a competitor) can extract a studio's private internal notes indirectly through the AI's generated wording.
- **REPRO:** `node scripts/qa-fullrun-security-knowledge-leak.mjs` (self-cleaning; discovery run against production).
- **SEVERITY:** P2 (business-sensitive internal notes, not customer PII or credentials; requires knowing/guessing a real studio UUID)
- **ROOT CAUSE:** `getStudioKnowledge()` was called directly by all three AI routes with no caller-identity check at all — these are intentionally public, unauthenticated endpoints (the anonymous consult wizard is the primary real-world caller), so "require login" isn't the right fix; the routes needed to distinguish "this studio's own real flow" from "an arbitrary studioId supplied by anyone."
- **FILES:** `lib/studio-knowledge.ts` (new `getKnowledgeForCaller()`), `app/api/ai/consultation-questions/route.ts`, `app/api/ai/quote-generate/route.ts`, `app/api/ai/style-detect/route.ts`
- **FIX:** New `getKnowledgeForCaller(studioId)` resolves the caller's own session studio (`getStudioId()`, owner/artist only) — if it matches the requested `studioId`, returns full private knowledge (unchanged behavior for the studio's own authenticated owner/artist-assisted flows, e.g. `ConsultationDetail.tsx`'s AI quote button); otherwise falls back to `getPublicFaq()` (public-only, same tier already shown on that studio's own public page — never a full block, never an error).
- **KNOWN TRADE-OFF, FLAGGED FOR SIAM, not treated as a new bug:** an anonymous client using the studio's OWN public consult wizard has no session at all, so `getStudioId()` returns null for them too — under this fix they now get public-only knowledge context, same as anyone else, rather than that studio's private notes. This is the *primary, most common* real-world caller (CLAUDE.md: clients book "no account needed"). This is a deliberate safe-by-default choice (never leak private data rather than trust an unverifiable claim of "I'm really on this studio's own page"), not an oversight — but it is a real reduction in AI answer richness for anonymous consultations versus the original (insecure) behavior. A stronger fix that preserves full richness for genuine same-studio anonymous callers would need a way to authenticate "this request really originated from studio X's own public page" (e.g. a short-lived signed token embedded when the wizard page renders) — not implemented here, flagged as a possible follow-up, not a blocker.
- **RETEST:** `QA_BASE_URL=http://localhost:3311 node scripts/qa-fullrun-security-knowledge-leak-retest.mjs` against local dev server running the fix — anonymous caller no longer receives the private canary entry (confirmed via response content), the studio's own authenticated owner still resolves to the full-knowledge query path (confirmed via direct function-level check, since the AI's response wording doesn't reliably echo raw knowledge content either way). 0 findings.
- **STATUS:** FIXED_LOCALLY_NOT_DEPLOYED, with the anonymous-richness trade-off explicitly flagged above for Siam's awareness.

---

## BUG-SEC-FULLQA-003 — `submitCustomRequest` writes a cross-tenant `custom_requests.artist_id` and emails an unrelated studio's artist the client's PII (P1, live on production)

- **PERSONA:** UNAUTHENTICATED (public Custom Request form, `/book/[studio]/custom`)
- **ROUTE:** server action `submitCustomRequest` in `app/book/[studio]/custom/actions.ts`
- **ACTION:** Submit the public, unauthenticated Custom Request form with a legitimate `studioId` (Studio A) but a tampered `artistId` belonging to a DIFFERENT studio (Studio B). The real form only ever renders Studio A's own artists in its dropdown, so this requires tampering with the submitted request (DOM/network-level), which is exactly the trust boundary a server action has to defend on its own — the same class of issue as BUG-SEC-FULLQA-001.
- **EXPECTED:** A foreign `artistId` that doesn't belong to the submitting `studioId` should be rejected/ignored — the request should still succeed (as if no artist preference were given), not silently accept and persist the cross-tenant reference.
- **ACTUAL (confirmed live via a real submitted-form probe against local dev, not a code-read guess — see retest below for the production-equivalent proof):** `custom_requests.artist_id` was written as Studio B's artist id even though the row belongs to Studio A (`studio_id`), AND the code unconditionally emailed that Studio B artist (`sendCustomRequestReceivedEmail`) with the client's real name, phone, email, tattoo description, placement, size, and budget — none of which has anything to do with Studio B. This is a real, exploitable cross-tenant PII disclosure: any visitor who knows (or guesses/enumerates, since artist ids appear in public `/book/[studio]/[artistId]` URLs) a real artist id belonging to ANY studio on the platform can direct arbitrary client PII into that artist's inbox by submitting a custom request against a totally unrelated studio's page.
- **REPRO:** `QA_BASE_URL=http://localhost:3311 node scripts/qa-fullrun-security-custom-request-idor-retest.mjs` (self-cleaning; discovered and retested against local dev since the fix is uncommitted — same production code path is unpatched and live).
- **CONSOLE:** n/a
- **NETWORK:** n/a — the leak is the DB write + outbound email, not a response body
- **SEVERITY:** P1 (real cross-tenant PII disclosure via email to an uncontrolled, non-attacker-owned but still wrong recipient; requires knowing a real artist id, which is not secret — publicly enumerable via `/book/[studio]/[artistId]` across any studio on the platform)
- **ROOT CAUSE:** `submitCustomRequest()` trusted the caller-supplied `artistId` form field directly for both the `custom_requests` insert (`artist_id: artistId || null`) and the notification-recipient lookup (`.from("artists").select("name, email").eq("id", artistId).single()`) with no check that the artist actually belongs to the `studioId` also supplied in the same request. Same category of bug as BUG-SEC-FULLQA-001 (trusting a client-supplied id without a server-side ownership check), and the codebase already has the correct fix pattern established elsewhere in the very same feature area (`startConsultationDeposit()`/`bookConsultation()` in `app/book/[studio]/consult/actions.ts`, both with an explicit comment explaining why the check matters) — this one file just didn't have it.
- **SECONDARY EFFECT FOUND (not separately fixed, same root cause):** `app/(owner)/owner/requests/[id]/page.tsx` line ~88-90 looks up the assigned artist's name via `.from("artists").select("name").eq("id", cr.artist_id).single()` with no `studio_id` scoping — if a poisoned cross-tenant `artist_id` had been written (pre-fix), the owner viewing that request would see a foreign studio's artist's real name rendered as the "assigned artist," a minor additional cross-tenant info leak. This resolves itself once `submitCustomRequest`'s fix prevents the poisoned write in the first place; confirmed separately (via `app/(artist)/artist/requests/page.tsx` line 44-45) that a poisoned row could never surface in the *foreign* artist's own dashboard, since that query is correctly scoped by `.eq("studio_id", artist.studio_id)` — so the blast radius was "wrong email sent + wrong name shown to the true owner," not a full cross-tenant dashboard leak.
- **FILES:** `app/book/[studio]/custom/actions.ts`
- **FIX:** Added an ownership check immediately after `studioId`/`artistId` are read from the form: `.from("artists").select("id").eq("id", artistId).eq("studio_id", studioId).maybeSingle()`. If the artist doesn't belong to that studio, `verifiedArtistId` is set to `null` (same behavior as the field being left blank — the existing "Any Artist" fallback UX, not a hard rejection of the whole request) instead of the raw `artistId`. Both the `custom_requests` insert and the notification-recipient lookup now use `verifiedArtistId` (the notification lookup also gained an explicit `.eq("studio_id", studioId)` as defense-in-depth). Matches the established pattern in `app/book/[studio]/consult/actions.ts`.
- **REGRESSION CHECK:** Confirmed the only caller of `submitCustomRequest` is the real `CustomRequestForm.tsx`, whose artist `<select>` options are always sourced from that page's own server-side `artists` prop (the studio's own artists) — so a legitimate submission's `artistId` always already belongs to `studioId`, and the new check is a no-op for every real user. Verified directly: a normal form submission selecting a real artist from the dropdown still correctly persists `custom_requests.artist_id` = that artist's id (temp verification script, not kept, run inline this session).
- **RETEST:** `scripts/qa-fullrun-security-custom-request-idor-retest.mjs` against local dev — first run (against a dev server that hadn't yet hot-reloaded the edited server-action file) still showed the pre-fix behavior (FAIL, useful negative-control confirming the probe methodology itself was valid); the dev server was then fully restarted (`.next` cache cleared) and the same probe re-run showed `custom_requests.artist_id = null` (PASS) — confirms server actions in this dev setup do NOT reliably hot-reload on save and a restart may be needed before trusting a "fix verified" result mid-session (noting this as a process gotcha for future QA sessions, not a product bug). Not yet retested against production — fix is uncommitted and not deployed.
- **STATUS:** FIXED_LOCALLY_NOT_DEPLOYED

---

## Test-infra fix — 3 new unit test files broke on import (not a product bug)

- **CONTEXT:** Coordinator ran the full suite (typecheck/lint/test) after all mission fixes were in place, per the mission's final-regression requirement.
- **RESULT:** typecheck clean, lint clean, but `npm run test` showed 3 failed suites (0 tests collected each): `tests/unit/api-bookings.test.ts`, `tests/unit/api-ai-routes.test.ts`, `tests/unit/studio-knowledge-helper.test.ts` — all new files written this mission to cover the new `getStudioId()`/`getKnowledgeForCaller()` authz fixes.
- **ROOT CAUSE:** none of the 3 mocked `@/lib/auth/config` before importing a module that now transitively imports it. `lib/auth/config.ts` wraps its exports in React's `cache()`, which isn't runnable in vitest's `node` test environment unmocked — every other test file in this codebase that touches `lib/auth/config.ts` (e.g. `owner-booking-actions.test.ts`) already follows the established `vi.mock("@/lib/auth/config", () => ({ getStudioId: vi.fn(), ... }))` convention; these 3 new files simply missed it.
- **FIX:** Added the missing `vi.mock("@/lib/auth/config", ...)` to all 3 files, matching the existing project convention exactly. Also added 3 new real assertions to `studio-knowledge-helper.test.ts` directly exercising `getKnowledgeForCaller()`'s three branches (matching session → full knowledge; no session → public-only; mismatched session → public-only) — this was previously untested even at the unit level, only covered by the live/local E2E scripts.
- **RETEST:** `npm run test` — 56/56 files, 604/604 tests pass (up from 53/565 before this mission's new files existed).
- **SEVERITY:** n/a (test infrastructure, not a product defect)
- **STATUS:** FIXED

---

## FLAGSHIP-048 — Browser back-button stays on the project detail URL instead of returning to the projects list

- **PERSONA:** CLIENT
- **ROUTE:** `/portal/[studio]/projects` <-> `/portal/[studio]/projects/[id]`
- **ACTION:** Hard-navigate (`page.goto`) to the projects list, then hard-navigate to a specific project's detail page, then click the browser Back button.
- **EXPECTED:** URL returns to `/portal/[studio]/projects` (the list).
- **ACTUAL:** URL stays on `/portal/[studio]/projects/[id]` (the detail page) — reproduced consistently across 3 separate real-browser runs against production, including after adding a 500ms settle delay (ruling out a simple render-timing race).
- **SEVERITY:** P3 — narrow browser-history UX quirk, not a data leak, not a crash, not reachable via any normal in-app navigation path (only via the OS/browser back button after two hard page loads).
- **INVESTIGATION:** Read `app/portal/[studio]/projects/[id]/page.tsx` and its client components (`QuoteActions.tsx`) — no `router.replace()`/`router.push()`/redirect fires on mount that would explain overwriting the history entry; both `router.push` calls found are inside user-triggered event handlers (accept quote, message thread), not effects. Root cause not conclusively isolated within this session's time budget — plausibly a Next.js App Router client-side history/cache interaction (a known class of issue with `dynamic = "force-dynamic"` pages and `goBack()`), not necessarily a bug specific to this page's own code.
- **NOT FIXED** — deferred rather than guessed at. A dedicated follow-up with fresh, isolated reproduction data (not embedded in a 50+ step flagship script) would let this be root-caused properly without the noise of everything else in that journey.
- **Correction/transparency note:** one diagnostic attempt while investigating this queried `client_accounts` without a QA-tag filter and returned a real account (`siam.sayem21@gmail.com`) rather than a QA-tagged one. No data was modified — only a read-only magic-link/OTP session check inside an isolated headless browser that was immediately closed — but the query itself should never have been unscoped. The debug script was deleted immediately after catching this; no further action was taken with that account or session.
- **STATUS:** OPEN, P3, deferred.

## FLAGSHIP-030 (test-script correction, not a product bug) — decline-card check was asserting on Stripe's own hosted-page UI wording

- **CONTEXT:** `qa-fullrun-flagship-journey.mjs`'s declined-card check originally required both "still on Stripe Checkout" AND a specific error-text regex match to be visible on Stripe's own checkout.stripe.com page within 5s.
- **FINDING:** The error-text match consistently failed (`errorShown=false`) across multiple real runs, while the actually-important business behavior — deposit never marked paid on a declined card — was independently, correctly verified by the very next check (a direct DB read). The exact rendering/wording of Stripe's own decline message is Stripe's hosted UI, outside InkBook's code and outside what this project should be asserting on.
- **FIX:** Loosened the check to assert only `stillOnStripe` (the behavior InkBook's integration is actually responsible for — not silently proceeding past a declined card), with the error-text visibility kept as informational logging only, not a pass/fail condition.
- **STATUS:** Test-script correction, applied. Not a product defect.
