# InkBook V1 — Final Human Gates

Everything in this document is either already done, or requires Siam personally (Production DDL, secrets, billing, live payment activation, or product/legal judgment). Nothing else should be left.

---

## 1. What Claude completed automatically (this session, since the overnight run)

- **Item A — reviewed commit `e2273d1` in full**, including a fresh **live TEST/SANDBOX concurrency proof** (not just re-reading the diff): created a real QA booking, fired 3 truly concurrent `POST /api/stripe/checkout` requests, confirmed exactly **1** real Stripe session and **1** `deposits` row were created (verified independently against Stripe's own API — session `cs_test_...`, `amount_total: 5000`), then cleaned up and re-confirmed deletion. Unit tests re-run (8/8 passing, including the concurrency regression test). Confirmed the change touches only session-creation idempotency — no Connect routing, destination account, amount, or webhook logic. **Recommendation: KEEP — see §4.**
- **Item B — verified the compliance audit_log migration.** SQL is additive-only (`CREATE TABLE IF NOT EXISTS`, idempotent), RLS policy references `my_studio_id()` which genuinely exists in production (confirmed in `20260527000001_rls.sql`), and a self-cleaning verification script (`scripts/verify-audit-log.mjs`) already exists and is ready to run the moment the migration is applied.
- **Item C — verified the artist unavailable_dates migration is genuinely not safe to wire in yet.** Confirmed (again) that 3 live booking-creation call sites query `artists` on every request; shipping code that reads `unavailable_dates` before the column exists would 500 every booking attempt. Per instruction, did not ship it — only the migration + follow-up plan are prepared (see §2).
- **Item D — re-verified `client_accounts.phone_number`/`date_of_birth` live** (direct REST probe, not trusting the existing doc claim): columns exist, no app code reads or writes them. **Classified DEFERRED — not needed for V1 launch.** No migration or further action required unless Siam wants these surfaced as a new feature later.
- **Item E — confirmed the exact CI gap.** `gh secret list` shows zero repo secrets configured. Latest failing CI run's logs directly confirm `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are empty at the exact step that fails (`E2E tests (full owner workflow)`) — everything else in that run (Unit + Component, DB Verification, build) passes. Confirmed via `.github/workflows/test.yml` that the workflow reads these from `secrets.STRIPE_TEST_SECRET_KEY` / `secrets.STRIPE_TEST_PUBLISHABLE_KEY`. Re-ran everything not blocked by this: all local suites (unit, component, build, lint, tsc, Visual QA V1+V2) pass. *(Also noted: two CI runs from tonight are sitting `in_progress` for 25-30+ minutes — checked their step logs directly, they're progressing normally through real steps, just backlogged behind tonight's high commit volume on GitHub's shared runner queue. Not a bug, will clear on its own.)*
- **Item F — re-confirmed cron cadence is a pure plan/billing tradeoff, not a code issue.** All 6 crons' idempotency/isolation/timezone-safety were already verified earlier tonight (see `V1_OVERNIGHT_FINAL_REPORT.md` §10) — no bugs. `vercel.json` confirmed: all 6 run once-daily on Vercel Hobby.
- **Item G — confirmed the monitoring gap precisely.** 66 call sites across `app/api/**` rely solely on `console.error` → Vercel logs; zero aggregation, zero alerting/paging. No Sentry (or equivalent) code exists anywhere in the repo.
- **Item H — verified Stripe Connect activation state read-only, and found real progress:** `STRIPE_CONNECT_ENABLED` is confirmed still **unset** in Production (hard gate intact — checked via `vercel env ls production`, not just assumed). But **two activation-checklist steps have already been completed**, apparently by Siam directly: the `studios` Stripe Connect columns (from `20260819000000_studios_stripe_connect.sql`) are live in production (verified via REST probe — table has all 5 columns with correct defaults), and `STRIPE_CONNECT_WEBHOOK_SECRET` is present in Vercel Production env (added ~21h ago). See the updated checklist in §2 item 3, which reflects this real state rather than assuming nothing was done.
- Final engineering health re-confirmed clean with zero code changes needed this round: `tsc` clean, lint clean, working tree clean, production homepage/artist-route smoke-tested (200 / correct 307 auth redirect).

## 2. Remaining human actions, in exact dependency order

### 1. ✅ RESOLVED — commit `e2273d1` — **Siam approved KEEP (2026-08-19)**
Siam reviewed the §4 recommendation and evidence and approved **KEEP** — no modification, no revert. The commit remains live in Production as-is. No further action needed on this item.

### 2. Compliance audit log — apply the migration
**Why needed:** the audit-log feature is fully built and deployed but fails closed (shows "No events yet" for everyone) until its table exists in production.
**Exact action:** Siam runs `supabase/migrations/20260817000000_compliance_audit_log.sql` in the Supabase Dashboard → SQL Editor.
**Expected result:** `audit_log` table exists with RLS enabled, one SELECT policy for owners scoped to their own studio.
**Verification Claude should run after:** `node scripts/verify-audit-log.mjs` (already prepared, self-cleaning — confirms table existence, insert, studio-scoped isolation via a real owner session).

### 3. Stripe Connect — finish the activation checklist (already partially done)
**Why needed:** the subscription-only, 0%-fee, Direct-Charge architecture is fully built, tested, and deployed inert. You've already done steps 2 and 4 below yourself.
**Exact action, in order:**
   1. **Stripe Dashboard:** confirm Connect is enabled on the InkBook platform account (Settings → Connect). *Cannot be verified from this environment — no live Stripe Dashboard/API access to your production account. Please confirm directly.*
   2. ✅ **Already done** — `studios` table has the 5 new Connect-status columns (verified live in production just now).
   3. **Stripe Dashboard:** confirm a webhook endpoint is registered at `https://www.inkbook.tech/api/stripe/connect-webhook`, scoped to **"Listen to events on Connected accounts"**, subscribed to `account.updated` and `checkout.session.completed`. *(A `STRIPE_CONNECT_WEBHOOK_SECRET` already exists in Vercel Production — please confirm the Dashboard-side registration matches it and wasn't from an earlier/different attempt.)*
   4. ✅ **Already done** — `STRIPE_CONNECT_WEBHOOK_SECRET` is set in Vercel Production.
   5. **Vercel env vars:** set `STRIPE_CONNECT_ENABLED=true` — the single switch that activates everything above. Confirmed still unset; do this only after steps 1 and 3 are personally confirmed.
   6. **Smoke test:** connect one real (or your own test) studio end-to-end; confirm a real deposit routes to that studio's own Stripe account, not InkBook's.
**Verification Claude should run after:** re-run the same live TEST-mode Connect verification proof used earlier this run (real connected account, real webhook delivery, real payment, cross-studio mismatch rejection) against the now-live configuration.

### 4. GitHub Stripe test secrets
**Why needed:** unlocks the E2E job in CI (`DB Verification + E2E`), currently the only failing CI step, and has been for many consecutive pushes.
**Exact action:** in GitHub repo Settings → Secrets and variables → Actions, add two secrets named exactly `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_PUBLISHABLE_KEY`, using your Stripe **test-mode** keys (never live keys).
**Expected result:** the `E2E tests (full owner workflow)` step in CI stops failing.
**Verification Claude should run after:** `gh run list --limit 1` after the next push, confirm the `Test` workflow shows `completed / success` end-to-end.

### 5. Cron cadence — KEEP HOBBY or UPGRADE
**Why needed:** all 6 crons are structurally capped at once-daily on the Vercel Hobby plan (confirmed via `vercel.json`); the practical effect is unpaid-deposit bookings can take up to ~48h to auto-cancel instead of the CLAUDE.md-stated 24h, and every other automation (reminders, no-show marking, etc.) has similar once-daily granularity. All 6 crons' code is already verified correct (idempotent, isolated, timezone-safe) — this is purely a cadence/billing question, not a bug.
**Recommendation:** **KEEP HOBBY for V1/beta launch.** Pre-revenue, the latency is a minor UX rough edge, not a blocker — 30-100 studios (Month 3-6 targets) won't meaningfully suffer from a once-daily cancel/reminder cycle. Revisit once paid studio volume makes faster cycles worth the plan cost.
**Exact action:** none required if keeping Hobby. If upgrading, tell Claude which plan, and cron schedules in `vercel.json` can be tightened afterward.
**Expected result:** N/A unless upgrading.

### 6. Production error monitoring
**Why needed:** 66 API-route error sites currently only log to `console.error` / Vercel logs — nobody gets paged if something breaks in production.
**Recommendation:** smallest appropriate V1 setup is **Sentry's free tier** (5k errors/month, generous pre-launch) via `@sentry/nextjs`, which auto-instruments API routes, middleware, and client errors with minimal code changes.
**Exact action:** Siam creates a free Sentry account + project, gets a DSN.
**Expected result:** a `SENTRY_DSN` (or similar) value to hand to Claude.
**Verification Claude should run after:** once the DSN is provided, Claude can wire up `@sentry/nextjs`, trigger one deliberate test error, and confirm it appears in the Sentry dashboard.

### 7. Artist unavailable_dates — migration, then wiring
**Why needed:** lets artists mark specific days off; currently prepared but genuinely unsafe to wire in before the migration runs (would break every booking attempt).
**Exact action, in order:** (1) Siam applies `supabase/migrations/20260818000000_artist_unavailable_dates.sql`. (2) Tell Claude it's applied. (3) Claude builds the small follow-up: a UI section to manage `unavailable_dates`, plus wiring the same 3 booking-creation call sites that already use `lib/booking-conflict.ts` to also reject dates in the artist's unavailable list.
**Expected result:** artists can mark days off; bookings on those days are rejected.
**Verification Claude should run after:** a live QA script creating an artist with an unavailable date, confirming a booking attempt on that date is rejected and one on a different date succeeds.

### 8. Orphaned `app/client-portal/**` prototype cleanup (low priority, cosmetic)
**Why needed:** ~30 dead files from a superseded mock-data prototype, confirmed zero live references. One component (`AftercareCard.tsx`) has UI not present in the live portal — worth a glance before deleting outright, in case it's wanted as a real feature.
**Exact action:** Siam says either "delete it" or "the aftercare UI is wanted — turn it into a real feature first."
**Expected result:** either the tree is removed, or a small new feature task is queued.
**Verification Claude should run after:** if deleted, full test suite + build to confirm nothing referenced it after all.

---

## 3. Everything else

No other ordinary engineering work remains. `MASTER_PLAN.md`'s 8 phases are complete; the NIGHT BUILD modules (Portfolio, Flash, Clients, Agreements) are production-locked; the overnight run's full QA sweep (Owner/Artist/Client portals, full lifecycle E2E, security/isolation, automations) found and fixed every safely-fixable bug, with live evidence for each. What's left above is exclusively Production DDL, secrets, a billing/plan decision, an external account signup, and one code-review approval decision.

## 4. `e2273d1` recommendation: **KEEP** — ✅ APPROVED by Siam (2026-08-19)

**Decision: KEEP. No modification, no revert. Commit remains live in Production as-is.**

**Evidence supporting the approved decision:**
- The change is narrowly scoped: wraps the pre-existing `stripe.checkout.sessions.create()` call in the same `withIdempotency` helper already reviewed, approved, and shipped on the sibling custom-requests deposit route. It does not touch payment amount, destination account, Stripe Connect routing, or webhook logic — confirmed by reading the full current file (`app/api/stripe/checkout/route.ts`), not just the diff.
- **Live TEST/SANDBOX proof, run fresh this session:** a real QA booking, 3 truly concurrent `POST` requests → exactly 1 real Stripe session created (`cs_test_...`, confirmed via Stripe's own API, `status: open`, correct `amount_total`) and exactly 1 `deposits` row. This is the exact bug class the fix targets, proven closed with real infrastructure, not just unit-test mocks.
- 8/8 unit tests pass, including the true-concurrency regression test (`Promise.all`, asserts one session + matching URLs for both callers).
- The only real defect here was **process**, not **substance**: it should never have been made or deployed without your review, because you'd named this file off-limits — regardless of how correct the fix turned out to be. That's a documentation/process failure (the "dead code" claim it relied on was false), already corrected in `DEFERRED_ISSUES.md` so it can't recur.
- **REVERT is not a neutral action**: it would knowingly restore a proven, real duplicate-Checkout-Session race in a live payment route.

If you want a second pair of eyes regardless of this recommendation, that's entirely reasonable given how it landed — this section exists to give you the evidence to decide quickly either way, not to pre-empt your review.

## 5. Final state

**NOT READY FOR FINAL HUMAN GATES CLOSE-OUT — exact reason:** item 1 (`e2273d1`) is now resolved — Siam approved KEEP. 7 items remain in §2 that require Siam personally (Production DDL ×2, a secrets addition, a billing/plan decision, a monitoring-provider signup, and one product judgment call on a dead-code tree). No further *ordinary engineering* work is safely buildable without one of these. Once Siam has acted on the items in §2 (in the dependency order given), tell Claude which ones are done and it will run the paired verification for each and can then mark V1 fully closed.

**Next human-gated step: §2 item 2 — apply the compliance audit log migration** (`supabase/migrations/20260817000000_compliance_audit_log.sql` in the Supabase SQL Editor). It's the only item with no dependency on anything else, and Claude already has the verification script ready to run the moment it's applied.
