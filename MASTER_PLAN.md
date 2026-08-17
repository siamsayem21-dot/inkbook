# InkBook V1 — Corrected Master Autonomous 8-Phase Completion Mission

**Authoritative as of 2026-08-17 (correction session).** This is the ONLY valid 8-phase structure for this mission. A prior recovery session (same day, earlier) invented its own 8-phase structure without ever having been given one, then graded itself "complete" against its own invention. Siam corrected this. That prior structure is preserved below under **Historical Appendix** as evidence only — none of its "COMPLETE" labels carry forward automatically. Every phase in this file starts from a genuine, evidence-based audit against the phases defined by Siam's correction prompt.

## The 8 phases (authoritative)
1. Full MVP Production Gap Audit
2. AI Consultation → Artist Match → Quote
3. Booking → Stripe → Deposit
4. Consent + Client Identity
5. Automations
6. Complete Client Journey + White-label
7. Full System Production Hardening
8. Beta Launch Readiness

## Status legend
`LOCKED` `IMPLEMENTED_NEEDS_HARDENING` `PARTIAL` `MISSING` `BLOCKED_NEEDS_SIAM` `NOT_REQUIRED` `NOT_YET_AUDITED`

---

## Phase 1 — Full MVP Production Gap Audit — **IN PROGRESS**

Method: five parallel independent audit agents re-verified prior claims against actual source code and live production (curl/WebFetch against `https://www.inkbook.tech` and a direct Supabase REST probe), explicitly instructed not to trust MASTER_PLAN.md/TASKS.md/DEFERRED_ISSUES.md's prior self-reported labels. Their findings are the evidence base below. Three more targeted audits are running for areas the first five didn't cover in depth (AI consultation→quote lifecycle, calendar/availability, artist onboarding, white-label slug edge cases, RLS policy depth, environment/config completeness) — this table will be updated when they return.

| Area | Status | Evidence |
|---|---|---|
| Public studio page | LOCKED | Live 200, real rendered content at `/book/demo-studio`, `/`, `/pricing` |
| White-label (path-based) | IMPLEMENTED_NEEDS_HARDENING | Path-based (`/book/[studio]`) works; wildcard subdomain not built (infra decision, pre-existing deferred item); invalid/real-slug live behavior not yet tested end-to-end against a real DB-backed studio — pending further audit |
| Auth (3 roles) | LOCKED | `lib/auth/config.ts` real Supabase queries; per-segment layout guards for owner/artist/client, no mocks |
| Supabase schema | LOCKED | `20260527000000_initial_schema.sql` has all 9 CLAUDE.md-required tables |
| Owner Portal | LOCKED | Spot-verified: revenue (real aggregation), clients (real joins), blacklist, audit-log route — all real DB queries, no mock data |
| Artist Portal | LOCKED | Spot-verified: earnings (real per-artist queries), agreements (real constraint + 228-line isolation test, not rushed despite same-day build→lock) |
| Client Portal | LOCKED | Real end-to-end: email-OTP auth → `client_accounts` upsert → dashboard/bookings/messages/settings all real Supabase queries; real Stripe remainder-balance checkout; real Claude API calls for AI consultation |
| Booking flow | LOCKED | No TODO/mock data anywhere in `app/book/[studio]/**` |
| Stripe deposit checkout | LOCKED | Real `stripe.checkout.sessions.create()`, real amounts, idempotent session reuse |
| Stripe webhook | LOCKED | Real signature verification (`stripe.webhooks.constructEvent`), 3 branches all idempotent |
| Unpaid deposit auto-cancel | IMPLEMENTED_NEEDS_HARDENING | Real DB function + real cron, but cron runs **once daily** (00:00 UTC) — worst-case cancellation latency ~48h, not the "24hrs" CLAUDE.md business rule states. Real gap, not a fabrication. |
| No-show deposit retention | LOCKED | Real, marks `deposit_kept: true`, correctly no refund issued |
| Remainder payment | LOCKED | Real Stripe Checkout via `getOrCreateDepositCheckoutSession`, confirmed from both owner-side and client-portal-side call paths |
| 1% platform transaction fee | BLOCKED_NEEDS_SIAM | Confirmed zero Stripe Connect integration anywhere (repo-wide grep, 33 matches all docs/marketing-copy, zero real API usage). Payout-architecture decision needed before this is buildable. |
| Consent form (age/minor/guardian) | LOCKED | Real client + server-side minor detection, guardian fields required server-side too |
| Consent ID photo validation | IMPLEMENTED_NEEDS_HARDENING | **Real bug found**: client `<input accept>` allows HEIC, server `validateImageFile()` allowlist does not (jpg/png/webp only) — iPhone users get client-accepted-then-server-rejected with a confusing error. Otherwise real magic-byte validation (not a stub). |
| "ID verification" labeling | NOT_REQUIRED (doc correction only) | What exists is real anti-spoofing file-type validation, not identity verification (no OCR/cross-reference). CLAUDE.md's actual requirement is just "full name + ID photo required to book" — met. Prior docs overstated this as "ID verification"; that label is being corrected, not the code. |
| SMS reminders (48hr/day-of) | LOCKED | Real Twilio API calls, real daily cron, per-studio timezone-aware, idempotency flags prevent double-send |
| Blacklist enforcement | LOCKED | Real email/phone match, studio-scoped, blocks on all 4 claimed booking paths |
| Waitlist / monthly cap | LOCKED | Real `isAtMonthlyCap` calls on 5 real sites, real daily cron for notify+promote |
| Session agreements | LOCKED | Real `UNIQUE NOT NULL booking_id` constraint, real isolation test |
| Client CRM | LOCKED | Real joined queries (booking count, consent status, blacklist status), no mock data |
| Compliance audit log | IMPLEMENTED_NEEDS_HARDENING (blocked on migration) | Code real and wired (4/4 call sites confirmed), fails closed correctly. **Directly confirmed via live Supabase REST probe** (not just claimed): `audit_log` table genuinely does not exist in production (`PGRST205`). No DB DDL credentials in this environment — BLOCKED_NEEDS_SIAM for the migration step specifically. |
| Revenue analytics | LOCKED | Real aggregation from `bookings`/`deposit_payments`/`custom_requests`, correctly shows empty state instead of faking data |
| AI Consultation → Artist Match → Quote lifecycle | NOT_YET_AUDITED (Phase 2 scope) | Only confirmed the chat engine makes real Claude API calls; reference image upload, style detection, artist matching, quote assistant, human-approval gate on binding price not yet independently verified — this is Phase 2's job |
| Calendar/availability | NOT_YET_AUDITED | Not covered by first 5 audits |
| Payment reminders / review requests crons | NOT_YET_AUDITED | Routes exist per build output (`/api/cron/payment-reminders`, `/api/cron/review-requests`) and are referenced in vercel.json per Phase 3-4 fork, but not independently read/verified yet |
| RLS policy depth | NOT_YET_AUDITED (flagged) | App-layer ownership/isolation checks confirmed correct (blacklist, agreements, waitlist all have real isolation tests), but several of these route through a service-role client that bypasses RLS — meaning correctness currently depends on app-layer code being right, not on RLS as a second line of defense. Needs a direct read of actual RLS policies in migrations to assess. |
| Visual QA coverage | PARTIAL | Confirmed covers only 7 static/unauthenticated routes (landing, pricing, privacy, terms, login, register, `/book/demo-studio`). **Zero visual regression coverage on any authenticated dashboard** (owner/artist/portal) — a large majority of the actual app surface. |
| Artist invite/onboarding | NOT_YET_AUDITED | Not covered by first 5 audits |
| Environment/config completeness | PARTIAL | Confirmed present: Supabase, Stripe (live), Twilio, Anthropic keys. Confirmed absent: `STRIPE_TEST_*` (blocks CI E2E + local e2e), `DATABASE_URL`/direct Postgres connection (blocks autonomous DDL). Broader review (error monitoring/Sentry, rate limiting, secrets rotation) not yet done. |
| `client_accounts.phone`/`dob` migration drift | BLOCKED_NEEDS_SIAM (pre-existing, unchanged) | Migration file exists, never applied, nothing reads the columns yet — low priority |
| Orphaned `app/client-portal/**` prototype | NOT_REQUIRED to fix, flagged for cleanup | Confirmed zero live references from anywhere in the app (repo-wide grep). One new finding: richer aftercare UI (`AftercareCard.tsx`) exists ONLY in this dead tree, not in the live `app/portal/**` — if "aftercare" was meant as a first-class portal feature, it's stranded in unreferenced code. |

**Phase 1 will be marked COMPLETE once the 3 pending targeted audits (AI consultation/quote lifecycle, calendar/availability + onboarding + white-label edge cases, RLS depth + config completeness) return.**

---

## Phase 2 — AI Consultation → Artist Match → Quote — **PENDING** (audit in progress, see Phase 1 row above)

## Phase 3 — Booking → Stripe → Deposit — **LARGELY VERIFIED IN PHASE 1**, hardening item open
Genuinely solid (see Phase 1 table): checkout, webhook, idempotency, no-show, remainder payment all LOCKED. One real hardening item: unpaid-deposit auto-cancel cron cadence (daily, not near-real-time) creates up to ~48h latency against the stated 24h business rule. Decision needed: tighten cron frequency (safe, cheap fix) vs. accept documented latency — leaning toward just tightening the cron, will do as a Phase 3/5 hardening task since it's a small, safe, non-destructive change (Vercel cron schedule + no schema change).

## Phase 4 — Consent + Client Identity — **LARGELY VERIFIED IN PHASE 1**, one real bug open
HEIC upload mismatch (see Phase 1 table) is a small, safe, non-schema fix — client accept list should match server allowlist. Will fix in this phase.

## Phase 5 — Automations — **PARTIALLY VERIFIED IN PHASE 1**
Deposit-expiry, no-show, SMS reminders, waitlist-notify all confirmed real and cron-scheduled. Payment-reminders and review-requests crons exist but not yet independently read/verified — pending.

## Phase 6 — Complete Client Journey + White-label — **PENDING**
Needs an actual live walkthrough against a real DB-backed studio slug (not `demo-studio`, which is a static marketing page, not a real dynamic studio) — none of the 5 initial audits could do this due to lacking a known real studio subdomain/credentials.

## Phase 7 — Full System Production Hardening — **PENDING**

## Phase 8 — Beta Launch Readiness — **PENDING**

---

## Historical Appendix — prior (invalid) reconstructed mission, evidence only

*The following was written by a recovery session earlier the same day, before Siam's correction. It invented its own 8-phase structure (different from the one above) and marked it "complete." That structure is NOT this mission. It is kept here only because the underlying code-level findings it contains turned out to be independently re-confirmed as accurate by this session's audit (see Phase 1 table above) — the narrative framing ("Phase X complete") is what was wrong, not necessarily every individual fact.*

Old Phase 1 (Foundation) → mapped into new Phase 1 audit, confirmed LOCKED.
Old Phase 2 (Booking+Deposit) → mapped into new Phase 3, confirmed LOCKED except cron cadence.
Old Phase 3 (Consent+SMS) → mapped into new Phase 4/5, confirmed LOCKED except HEIC bug.
Old Phase 4 (Dashboards+Deploy) → mapped into new Phase 1 Owner/Artist Portal rows, confirmed LOCKED.
Old Phase 5 (Blacklist/CRM/Agreements/Waitlist) → mapped into new Phase 1 + 5, confirmed LOCKED.
Old Phase 6 (Compliance log/ID verification/analytics/fee) → mapped into new Phase 1, confirmed IMPLEMENTED_NEEDS_HARDENING (audit log migration) / BLOCKED_NEEDS_SIAM (fee) / NOT_REQUIRED (ID verification label correction) / LOCKED (analytics).
Old Phase 7 (Client Portal) → mapped into new Phase 1 + 6, confirmed LOCKED for what exists, but full client-journey walkthrough against a real studio not yet done (new Phase 6 job).
Old Phase 8 (Final QA sweep) → typecheck/lint/unit/build all confirmed genuinely green by this session too (re-run, not just trusted) — folds into new Phase 7/8.
