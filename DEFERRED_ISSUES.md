# InkBook — Deferred Issues

Issues that cannot be safely completed autonomously, or that are intentionally out of scope for the 8-Phase V1 Completion Mission. Each entry says *why* it's deferred and what would unblock it.

---

## 1. State-specific tattoo consent legal text
**Phase:** 3. **Status:** deferred, not started.
US tattoo-consent law varies by state (minimum age with/without guardian consent, required disclosures, some states ban minor tattoos outright regardless of consent). The current consent form (`components/booking/ConsentForm.tsx`) uses one generic guardian-consent flow for all states.
**Why deferred:** this is legal content, not code. Fabricating state-by-state legal thresholds without a verified legal source would create real liability for studios using the platform. Not something to guess at autonomously.
**Unblock:** Siam supplies verified per-state requirements (or a licensed legal source) to encode.

## 2. Wildcard subdomain routing (`studioname.inkbook.tech`)
**Phase:** 2/4 (white-label). **Status:** deferred, not started.
Per `DEPLOY.md`, this requires a wildcard DNS entry + Vercel Pro custom domain config — infrastructure, not app code. Current white-labeling is path-based (`inkbook.tech/book/[studio]`), which is fully functional for V1 and was treated as sufficient in earlier phases.
**Unblock:** Siam decides whether/when to add the wildcard domain + DNS in Vercel; app code (studio resolution) would need only a small middleware change once the domain exists.

## 3. 1% Stripe platform transaction fee — cannot be built as scoped; deeper gap found underneath it
**Phase:** 6. **Status:** investigated, NOT built — this is bigger than a fee, see below. **Requires a Siam product/architecture decision, not just an approval.**

Started to build this as a small addition (`application_fee_amount` on the existing deposit/remainder Stripe Checkout session in `lib/stripe/deposit-checkout.ts`). Stopped once the code audit showed why that's the wrong fix:

**`application_fee_amount` only means anything inside Stripe Connect** — it splits a charge between the platform and a *connected account*. This codebase has **no Stripe Connect integration at all** (confirmed by grep: zero matches for `stripe.accounts`, `connected_account`, any per-studio `stripe_account_id`, `stripe.transfers`, or any `payout` concept anywhere in `app/` or `lib/`). Every client deposit and remainder payment goes through one single Checkout Session against InkBook's own central Stripe account (`STRIPE_SECRET_KEY`) — the same account used for the owner-facing subscription billing (Solo/Studio/Pro plans). There is currently **no code path that moves any of that client payment money to a studio at all.**

So the real gap isn't "add 1%" — it's: **studios have no way to receive the tattoo-deposit/remainder money their own clients pay through the platform.** Bolting `application_fee_amount` onto the current single-account checkout would not compute a fee against anything (there's no connected account to split from) and risks either a Stripe API error or, worse, silently doing nothing while looking like it works.

**Why this needs Siam, not autonomous code:** this is a payment-architecture decision with real compliance and money-movement consequences (who is the merchant of record, KYC requirements, payout timing, chargeback liability) — squarely the kind of "Stripe/payment change" CLAUDE.md requires approval for, and beyond that, it's a product decision about how InkBook actually gets paid, not a bug.

**Options for Siam to choose between** (not a recommendation to build any of these unilaterally):
- **Stripe Connect** (separate accounts, KYC per studio) — the standard way to run this exact business model (platform takes a cut, connected merchants get the rest). Real onboarding/KYC work; the `stripe:connect-recommend` and `stripe:connect-required-verification-information` skills exist specifically to scope this.
- **Manual payouts** (Siam/InkBook holds all funds, reconciles and pays studios out-of-band, e.g. monthly ACH/check) — no Connect needed, but doesn't scale past a handful of studios and has no code support today either (would still need a "studio balance owed" ledger).
- **Fee-only, no split** — track a 1% "fee" figure for reporting purposes without actually moving money differently, if Siam's actual near-term plan is to keep collecting 100% into the platform account regardless. Cheapest to build, but doesn't match the "+1% transaction fee" framing in CLAUDE.md (which implies studios normally keep the other 99%).

**Unblock:** Siam decides which model InkBook is actually running on, then this becomes a scoped, buildable task.

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
