# InkBook — Deferred Issues

Issues that cannot be safely completed autonomously, or that are intentionally out of scope for the 8-Phase V1 Completion Mission. Each entry says *why* it's deferred and what would unblock it.

---

## 0. 🔴 CRITICAL — `custom_requests.updated_at` missing in production; breaks ALL custom-request deposit reconciliation, live, today
**Phase:** 3 (payments). **Status:** confirmed via live TEST-mode payment + direct schema probe, 2026-08-19. **NOT a Stripe Connect bug — pre-existing, affects the current live platform-account flow too. Requires Siam approval before any fix is applied (production DDL/RPC change).**

**What's broken:** `supabase/migrations/20260622000000_custom_requests.sql` defines `custom_requests.updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` plus a trigger to auto-maintain it, and the `process_custom_request_deposit` RPC (`supabase/migrations/20260623000005_process_custom_request_deposit_rpc.sql:188`) explicitly sets `updated_at = NOW()` in its UPDATE statement. **But the live production `custom_requests` table does not actually have this column** — confirmed two independent ways:
1. A completed real TEST-mode Stripe payment ($50, `cs_test_a1ll5T44eJGh6FP53HhZDOZOuFVadhdb4cZ9k4TzN6rHf4B1tSILKKcEBh`, `payment_status: "paid"` per Stripe's own API) never reconciled — `custom_requests.status` stayed `"quoted"`, `stripe_payment_intent_id` stayed `null`, no booking was created. The webhook was delivered (confirmed in listener logs) but the server returned `500` with `column "updated_at" of relation "custom_requests" does not exist`.
2. Direct Supabase REST probe: `GET .../custom_requests?select=updated_at` → `42703 column custom_requests.updated_at does not exist`.

**Impact — this is serious:** every real client who has ever paid (or ever pays) a custom-request deposit through the CURRENT LIVE platform-account flow (`app/api/stripe/webhook/route.ts`'s Branch B, `handleCustomRequestDeposit`, which calls this exact same RPC) hits this exact same failure. Their payment succeeds on Stripe, money is taken, but InkBook's own database never learns about it — `status` never advances past `"quoted"`, no booking is created, the client-facing page keeps showing an unpaid quote forever. This is the deep root cause behind the "button stays active after payment" bug Siam found — not a race condition, a *total, silent reconciliation failure* for this entire payment path. It is independent of Stripe Connect (`STRIPE_CONNECT_ENABLED` is false in Production and this bug still fires) — it's been present since this feature shipped.

**Why not fixed automatically:** fixing this means either (a) adding the missing column via `ALTER TABLE custom_requests ADD COLUMN updated_at ...` (a production schema migration), or (b) editing the RPC function body to stop referencing a column that doesn't exist (`CREATE OR REPLACE FUNCTION` against production). Both are production DDL/function changes — a hard approval gate per both CLAUDE.md and `.claude/skills/inkbook-ops/SKILL.md`. Not applied without explicit sign-off, per this session's explicit "do not touch Production" instruction.

**Recommended fix (smallest, safest option):** remove the single erroneous `updated_at = NOW()` line from the RPC's UPDATE statement (`process_custom_request_deposit`, migration `20260623000005`, line 188) — no schema change needed at all, since the column was never real to begin with and nothing else references it. This is a one-line `CREATE OR REPLACE FUNCTION` fix. (Alternative: add the missing column instead, if `updated_at` tracking on this table is actually wanted — a slightly larger, equally safe additive migration.)

**Unblock:** Siam reviews and approves one of the two fix options above; either is small and low-risk, but both require Siam's explicit approval to apply to production per the standing approval-gate rules. This should be treated as urgent — real client payments are affected today.

## 1. State-specific tattoo consent legal text
**Phase:** 3. **Status:** deferred, not started.
US tattoo-consent law varies by state (minimum age with/without guardian consent, required disclosures, some states ban minor tattoos outright regardless of consent). The current consent form (`components/booking/ConsentForm.tsx`) uses one generic guardian-consent flow for all states.
**Why deferred:** this is legal content, not code. Fabricating state-by-state legal thresholds without a verified legal source would create real liability for studios using the platform. Not something to guess at autonomously.
**Unblock:** Siam supplies verified per-state requirements (or a licensed legal source) to encode.

## 2. Wildcard subdomain routing (`studioname.inkbook.tech`)
**Phase:** 2/4 (white-label). **Status:** deferred, not started.
Per `DEPLOY.md`, this requires a wildcard DNS entry + Vercel Pro custom domain config — infrastructure, not app code. Current white-labeling is path-based (`inkbook.tech/book/[studio]`), which is fully functional for V1 and was treated as sufficient in earlier phases.
**Unblock:** Siam decides whether/when to add the wildcard domain + DNS in Vercel; app code (studio resolution) would need only a small middleware change once the domain exists.

## 3. Stripe Connect payment architecture — DECIDED (2026-08-19), safe prep COMPLETE, activation pending
**Phase:** 3/6. **Status:** architecture approved by Siam, all safe code preparation built/tested/deployed inert, activation NOT yet flipped on. **No longer an open product question — see below for exactly what's left, which is 100% manual Stripe/Supabase/GitHub steps, not engineering.**

**Decision:** InkBook is subscription-only. No 1% fee, no application fee, no percentage taken from any client payment, ever. Client deposit/remainder payments go 100% directly to the studio's own Stripe account via **Stripe Connect, Standard connected accounts, Direct Charges, zero application fee**. InkBook's only revenue is the existing studio subscription (unchanged).

**What's built (commit range starting `[connect architecture]`, all inert in production today — see below for why):**
- `supabase/migrations/20260819000000_studios_stripe_connect.sql` — additive `studios` columns, prepared, **NOT applied**.
- `lib/stripe/connect.ts` — the single flag (`STRIPE_CONNECT_ENABLED`, unset/false in production) gating every new surface below. With it off, none of this code runs at all.
- `lib/stripe/deposit-checkout.ts` and `app/api/custom-requests/[id]/deposit/route.ts` — both updated with a flag-gated Direct Charge branch. **Fail-closed, no exceptions**: if a studio has no connected account or `charges_enabled: false`, returns `payment_setup_required` and never creates a Checkout Session against InkBook's platform account as a fallback.
- `app/api/stripe/connect/onboard/route.ts` (+ `login-link/route.ts`) — Stripe-hosted onboarding (Standard account creation + Account Link), resume/refresh flow, Stripe-hosted "manage on Stripe" login link.
- `app/api/stripe/connect-webhook/route.ts` — **separate, self-contained endpoint** (the existing live `app/api/stripe/webhook/route.ts` was NOT touched). Studio identity for every event is derived from Stripe's own `event.account`, never from client-suppliable metadata — the strongest isolation guarantee available. Handles `account.updated` (status sync) and `checkout.session.completed` for both the `deposit_payments` and `custom_requests` payment paths, with an explicit cross-studio mismatch check before ever reconciling a payment.
- `app/(owner)/owner/settings/billing/StripeConnectCard.tsx` — new UI section, gated server-side behind the same flag (the page doesn't even query the new columns when the flag is off, so it's safe pre-migration too).
- 33 new tests across 5 files, including the single most important one: a live-code-path proof that a cross-studio mismatch (a booking/custom_request belonging to Studio B reconciled against an event from Studio A's connected account) is refused before any write happens. `tsc`/lint/full unit suite (569/569)/production build all independently re-verified clean.

**Why this is safe to have already deployed:** every new code path — the onboarding route, the connect-webhook, the Direct Charge branch in both checkout-creation call sites, and the UI section — checks `STRIPE_CONNECT_ENABLED` before doing anything, including before querying the new `studios` columns (which may not exist in production yet). With the flag unset (today's state), this code is provably inert: a dedicated regression test proves `getOrCreateDepositCheckoutSession` behaves byte-for-byte identically to before this work, with zero new DB queries. **No live payment routing has changed. No Stripe accounts have been created. No production webhook was touched.**

**What's left — NEEDS_SIAM, manual steps only (see TASKS.md for the exact checklist):** apply the migration; enable Connect on the Stripe platform account; register the connect-webhook endpoint in the Stripe Dashboard and copy its secret into `STRIPE_CONNECT_WEBHOOK_SECRET`; only then set `STRIPE_CONNECT_ENABLED=true`. Until all of that happens, tattoo payments keep working exactly as they do today (100% to InkBook's platform account) — there is no in-between broken state.

**Also deferred, by Siam's explicit instruction:** cleanup of the legacy/dead payment code (`app/api/stripe/checkout/route.ts`, the `deposits` table Branch C, confirmed zero live callers in an earlier audit this session) — intentionally left alone until the new architecture is fully verified and locked in production.

## 4. Orphaned `app/client-portal/**` prototype
**Phase:** 6/7 (cleanup, not a completion blocker). **Status:** identified, not removed.
Single-commit (`410863d`) mock-data prototype for the client portal, fully superseded by the real, live `app/portal/[studio]/**` built across Phase C. Confirmed zero references anywhere else in the codebase (`grep` for `client-portal` only self-matches inside the directory, re-confirmed 2026-08-17 correction session). Not a working feature — dead weight, not a locked module.
**New finding (2026-08-17 correction session):** the dead tree contains richer aftercare UI (`AftercareCard.tsx`) that does **not** exist in the live `app/portal/**` — if "aftercare" was ever meant as a first-class client-portal feature (it's listed in CLAUDE.md's MVP feature list only implicitly, via "session-by-session digital agreement" adjacent concepts, not explicitly), the working version of that UI is stranded in unreferenced code. Worth a look before deleting the tree outright — there may be real, reusable work in there.
**Why deferred:** deleting ~30 files is a moderately destructive action outside this mission's explicit scope, even though the risk of breaking anything is effectively zero.
**Unblock:** Siam confirms it's safe to delete (or salvage the aftercare UI first, then delete), or it's picked up as a dedicated cleanup task.

## 5. Migration drift — `client_accounts.phone`/`client_accounts.dob` (carried over, pre-existing)
**Phase:** N/A (infra). **Status:** unresolved, low priority — unchanged from before this session.
`20260809000000_client_accounts_phone_dob.sql` exists in the repo but was never applied to production. Nothing in the app currently reads either column (My Profile renders their absence gracefully). Confirmed still true.
**Unblock:** Siam confirms whether/when to apply the migration.

## 6. CI Stripe secrets gap (carried over, pre-existing)
**Phase:** N/A (infra). **Status:** unresolved, low priority — unchanged from before this session.
`tests/e2e/owner-workflow.spec.ts` fails in GitHub Actions because `STRIPE_TEST_SECRET_KEY`/`STRIPE_TEST_PUBLISHABLE_KEY` are not configured as repo secrets. Confirmed identical failure signature across many consecutive master pushes, unrelated to any app code.
**Unblock:** Siam adds the two Stripe test-mode secrets to the GitHub repo.

## 7. Automation cron cadence is structurally capped at once-daily (Vercel Hobby plan)
**Phase:** 5. **Status:** confirmed structural, not a code bug — one related code bug already found and fixed this session (see below).
All 6 crons (`cancel-expired`, `sms-reminders`, `no-show`, `payment-reminders`, `review-requests`, `waitlist-notify`) run once daily, confirmed via `vercel.json` and git history (`78b2f28`, `7d27e72` — both explicit downgrades from a more frequent cadence because "Hobby accounts are limited to daily cron jobs"). This means: unpaid-deposit bookings can take up to ~48h to auto-cancel (not the "24hrs" CLAUDE.md business rule states), and every other automation has similar once-daily granularity. **One concrete bug from this root cause was found and fixed this session:** `payment-reminders`' deposit-reminder window was still sized for an abandoned 4-hour cadence, causing most reminders to silently never fire — fixed by widening the window to 25h (commit `80b8613`). The cadence limitation itself remains and cannot be fixed in code — it requires either accepting the documented latency, or upgrading the Vercel plan (a billing decision).
**Why deferred:** plan/billing decision, not a coding task.
**Unblock:** Siam decides whether ~24-48h automation latency is acceptable for V1/beta, or upgrades the Vercel plan for more frequent crons.

## 8. "Artist Match" in AI Consultation flow doesn't exist as an AI feature
**Phase:** 2. **Status:** confirmed via code read, not built.
CLAUDE.md-adjacent product framing (and this mission's own Phase 2 name) implies AI matches a client's consultation to a suitable artist. In reality, the owner manually picks the artist from a plain dropdown (`ConsultationDetail.tsx`) — there is no AI-driven matching logic anywhere. Everything else in the consultation→quote lifecycle (reference image upload, AI style detection, AI quote assistance, and critically a real two-sided human-approval gate before any price becomes binding) is confirmed real and working.
**Why deferred:** unclear whether "AI artist matching" was ever an intended V1 feature or just phase-naming shorthand for "the consultation flow that leads to picking an artist" — a product-scope question, not a bug.
**Unblock:** Siam clarifies whether AI-driven artist matching is in scope for V1, or whether manual artist selection (already working) is the intended design.

## 9. No production error monitoring/alerting
**Phase:** 7. **Status:** confirmed missing, not started.
No Sentry/Bugsnag/Rollbar/Datadog or any error-tracking SDK anywhere in the repo. All error handling is `console.error`/`console.log`, visible only via Vercel function logs. A production error (a cron silently failing, a webhook throwing, an unhandled exception) would only surface via someone manually checking logs or a user reporting it after the fact.
**Why deferred:** adding a monitoring provider (Sentry etc.) means a new external service/API key, which is a legitimate small product/infra decision, not something to silently bolt on.
**Unblock:** Siam picks a provider (or approves a specific one, e.g. Sentry's free tier) and this becomes a small, safe, buildable task.

## 10. Rate limiting gaps on OTP login + consultation-start
**Phase:** 7. **Status:** confirmed, real gap.
`lib/rate-limit.ts` (a real in-process sliding-window limiter, self-documented as needing an upgrade to `@upstash/redis` before high-traffic launch) is wired into most public POST routes (bookings, custom-requests, consent-forms, stripe/checkout, waitlist, AI routes) — but the client-side OTP login (`EmailLoginForm.tsx` → `supabase.auth.signInWithOtp`) and consultation-start (`app/book/[studio]/consult/**`) have no app-level rate limiting of their own, relying entirely on Supabase's built-in email-rate-limit defaults.
**Why deferred:** not necessarily exploitable today at V1's traffic scale, but a real gap against "protect public-facing unauthenticated routes" that should be closed before wider beta traffic.
**Unblock:** none needed from Siam — safe to build directly (reuse the existing `lib/rate-limit.ts` pattern) as a hardening task.

## 11. Calendar/availability — buffer-based conflict check shipped, day-off support prepared but not applied
**Phase:** 6. **Status:** partially resolved this session (strict completion mission, 2026-08-18) — see below for exactly what's done vs. still needs Siam.

**Done, shipped, live in production (commit `9650682`):** the exact-time-only collision check was widened to a same-day buffer (`lib/booking-conflict.ts`, `BOOKING_CONFLICT_BUFFER_MINUTES = 240`) — any two active bookings for the same artist within 4 hours of each other now conflict, not just identical times. No schema change, no migration needed, deployed and tested (unit tests + full suite green). This closes the most obvious double-booking risk (overlapping session times) without any deploy risk.

**Not done, needs Siam — day-off/working-hours support:** `bookings` has no duration column and there's no per-artist unavailable-date concept at all, so true duration-aware overlap and artist-configurable day-off blocking both require schema changes. A migration is now **prepared but NOT applied**: `supabase/migrations/20260818000000_artist_unavailable_dates.sql` (adds `artists.unavailable_dates DATE[]`, additive, `NOT NULL DEFAULT '{}'`, idempotent). Deliberately **not wired into any live code path yet** — the booking-creation routes already query `artists` on every single booking, so deploying code that references a column not yet in production would break booking creation entirely, which is unacceptable. The follow-up (UI to manage the dates + wiring the 3 booking-creation call sites to reject dates in that array) is a small, scoped task once the migration is confirmed applied — intentionally not built ahead of that to avoid the deploy-ordering hazard.
**Unblock:** Siam applies `supabase/migrations/20260818000000_artist_unavailable_dates.sql` in the Supabase SQL Editor. Once confirmed, the follow-up UI+wiring task can proceed immediately.

## 12. Minor hardening/cleanup items (not launch blockers)
**Phase:** various. **Status:** identified, safe to fix anytime, low priority.
- No server-side idempotency key on consultation submission — a retried POST (flaky network) could create a duplicate consultation/lead row. Not data-corrupting, just a possible duplicate lead for the owner to notice.
- Two parallel quote-generation endpoints (`/api/ai/quote-generate` and `/api/quote/generate`) — unclear if both are in active use or one is dead code; needs a quick look.
- Unused `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env var and unused `@stripe/stripe-js` dependency — dead weight from an entirely server-side Stripe Checkout redirect flow, not a bug.
- Stale git worktree `.claude/worktrees/fix-studio-delete-security-definer` — confirmed fully merged into master already (`git merge-base --is-ancestor` verified 2026-08-17), just an uncleaned leftover from finished work, not an unresolved security issue. Safe to `git worktree remove` whenever convenient.
**Unblock:** none needed — pick these up opportunistically.

## 5. Migration drift — `client_accounts.phone`/`client_accounts.dob` (carried over, pre-existing)
**Phase:** N/A (infra). **Status:** unresolved, low priority — unchanged from before this session.
`20260809000000_client_accounts_phone_dob.sql` exists in the repo but was never applied to production. Nothing in the app currently reads either column (My Profile renders their absence gracefully). Confirmed still true.
**Unblock:** Siam confirms whether/when to apply the migration.

## 6. CI Stripe secrets gap (carried over, pre-existing)
**Phase:** N/A (infra). **Status:** unresolved, low priority — unchanged from before this session.
`tests/e2e/owner-workflow.spec.ts` fails in GitHub Actions because `STRIPE_TEST_SECRET_KEY`/`STRIPE_TEST_PUBLISHABLE_KEY` are not configured as repo secrets. Confirmed identical failure signature across many consecutive master pushes, unrelated to any app code.
**Unblock:** Siam adds the two Stripe test-mode secrets to the GitHub repo.

---

## Explicitly NOT deferred (checked and found already complete this session)
- Client ID photo file-type validation — real magic-byte + MIME + extension checks confirmed at consent-form step; note this is anti-spoofing file validation, not identity/OCR verification, which CLAUDE.md never actually required (see #8-era note in MASTER_PLAN.md Phase 1 table).
- Blacklist enforcement, waitlist auto-promote/cap, session-agreement↔booking linking, remainder payment collection, client CRM, artist invite/onboarding, white-label slug resolution (clean 404 on invalid slug, no cross-studio leak), RLS policies (real, exist for all core tables — though a service-role-client caveat applies, see MASTER_PLAN.md Phase 1) — all independently re-confirmed live in code by 5+ adversarial audit agents during the 2026-08-17 correction session, not just carried forward from docs.
- Advanced revenue analytics — 6-month trend chart confirmed live on `/owner/revenue` with real aggregated data, correctly shows an empty state instead of faking numbers.
- Two real bugs found this same session were fixed directly rather than deferred (both small, safe, non-schema): payment-reminders cron window mismatch (commit `80b8613`), ConsentForm HEIC client/server allowlist mismatch (commit `80b8613`).
