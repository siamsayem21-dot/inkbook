# InkBook — Exhaustive Product Verification Master Ledger

Started 2026-08-25. This is the persistent state file for the exhaustive QA +
autonomous fix mission. If context is lost/compacted, read this file first,
then `PRODUCT_COVERAGE_MATRIX.md`, `INTERACTION_COVERAGE.md`,
`DESIGN_MOTION_COVERAGE.md`, `EXHAUSTIVE_ISSUES.md`, `git status`, `git log`
— find LAST VERIFIED ITEM / NEXT EXACT ITEM below and resume there. Do not
restart from zero.

## STARTING STATE (read once, do not re-derive)
- Branch: `master`. The design-depth-correction work (real visible depth +
  wired motion, previously rejected then corrected) is MERGED to master
  (`8d447fd`) and **already deployed to production** — this happened via a
  direct "deploy kro" instruction from Siam in the turn immediately before
  this exhaustive mission was issued. Confirmed via GitHub commit status
  (`success`, "Deployment has completed") and a fresh `Age: 0` response from
  `www.inkbook.tech`. This exhaustive mission is NOT starting from a
  pre-deploy state — production already has the corrected design/motion
  work. Any NEW bugs found and fixed during this mission still need a fresh
  Siam-approved deploy per the standing CLAUDE.md gate; this mission does not
  re-litigate the design/motion work that was already approved and shipped.
- `.agents/` and `AGENTS.md` are pre-existing untracked files, not created by
  any session in this conversation — left alone, not touched.
- Environment: no Docker/`supabase` CLI available locally → `npm run test:db`
  (pgTAP-style RLS suite against local Postgres) cannot run here — this is a
  pre-existing, previously-documented environment gap (see DEFERRED_ISSUES.md
  history), not new. RLS/isolation is instead verified via real functional
  tests against the actual (shared) Supabase project using tagged, temporary,
  self-cleaning QA studios/artists/clients — the same proven pattern used
  successfully throughout this entire session's prior QA work.
- No Chrome extension connection available this session (checked, unavailable)
  → all interactive/motion verification uses Playwright (already proven
  extensively this session: real login, real OTP cookie-injection for Client
  Portal, real pointer-move hover simulation with `getComputedStyle` readback).
- Existing test infra found and being reused, not rebuilt: `tests/db/*.test.ts`
  (7 files, RLS/cascade/constraint/schema tests — blocked locally, see above),
  `tests/e2e/owner-workflow.spec.ts`, `tests/unit/**` (56 files, part of the
  601-test `npm test` suite), `tests/visual` + `tests/visual-v2` (baseline
  screenshot diffing — not the right tool for this mission's fresh-evidence
  requirement, see DESIGN_SYSTEM_UPGRADE.md's own note on this), `scripts/*.mjs`
  (46 existing utility/QA scripts, several directly reusable:
  `qa-design-system-sweep.mjs`, `qa-motion-visual-verify.mjs`,
  `qa-overnight-owner-sweep.mjs`, `qa-overnight-artist-sweep.mjs`).

## CURRENT PHASE
**MISSION COMPLETE.** All 40 completion criteria satisfied. Final report
written: `EXHAUSTIVE_QA_FINAL_REPORT.md`. Verdict: **C — LAUNCH BLOCKERS
REMAIN** (1 P0 + 2 P1, all BLOCKED_NEEDS_SIAM).

Phase A (Auth) — DONE. Phase C (Artist Portal) — DONE. Phase D (Client
Portal) — DONE. Phase B (Owner Portal) — DONE (45 interactions, 0 real
findings). Phase E (Public/White-label) — DONE (33 interactions, 0 real
findings, including the first real-Stripe-TEST-payment test of the classic
direct-booking flow). Automations/Cron — DONE (1 NEW REAL P1 BUG FOUND).
Security/RLS sweep — DONE (all 31 API routes have a status, live IDOR probe
0 findings). Design/Motion re-verification — DONE (15 checks, 0 findings).
Error/resilience — DONE (23 checks, 0 findings). A11y/console/perf — DONE
(18 checks, 0 findings). Final regressions — DONE (production cleanliness
audit + flagship journey re-run). Final build/test gate — DONE (601/601).
Core cross-role journey (`qa-full-studio-journey.mjs`) — verified twice,
PASS end-to-end both times. `/book/[studio]/consult` reachability, once
noted as uncertain, is now confirmed real via source read during the final
regression pass. Remaining known gaps (deliberately not blocking, tracked
as NOT_TESTED, documented with reasons in `EXHAUSTIVE_QA_FINAL_REPORT.md`):
a handful of standalone Owner detail pages already covered via equivalent
paths, real 6-digit OTP code entry through the public login UI (no
test-inbox access), and direct authenticated testing of 3 cron routes
(correct production `CRON_SECRET` not obtainable this session).

## CURRENT ROLE / ROUTE / STATE / ACTION
Final regressions — DONE (production cleanliness audit + flagship journey
re-run). Final build/test gate — DONE (601/601, confirmed just now).
Transitioning to the final report.

## LAST VERIFIED ITEM
Final regression pass complete: (1) a full production-wide scan found 10
orphaned QA-tagged studios and 33 orphaned QA auth users left behind by
earlier crashed/interrupted runs (some predating this mission) — all
cleaned, one needed a manual `consent_forms` cleanup first (a live instance
of the documented RESTRICT-FK/no-CASCADE gotcha), final re-scan confirms
zero remaining; (2) `scripts/qa-full-studio-journey.mjs` re-run one final
time end-to-end — the flagship AI Consultation → Quote → Artist Match →
Stripe TEST Deposit → Webhook → Booking → Cross-Role Visibility journey
still works correctly; its "2 findings" are both already-known/explained
(the standing P1 re-confirming itself as expected, and a pre-existing
test-script limitation on `/book/[studio]/consult`'s form-detection that
also corrected an earlier over-cautious NOT_TESTED note — that route is
confirmed real and reachable). Final build/test gate: `npm test` run
explicitly one more time, 601/601 clean. A11y/console/perf (prior block):
18 checks, 0 findings, plus a correction that the previously-documented
`StandaloneConsentForm` unlinked-label bug has evidently been fixed since
it was last recorded. Error/resilience (prior block): 23 checks, 0
findings. Design/Motion (prior block): 15 checks, 0 findings. Security/RLS
(prior block): all 31 API routes have a status. Automations/Cron (prior
block): 1 real NEW P1 bug found (cron/sms-reminders).

## NEXT EXACT ITEM
Write the final report (Section 61 of the mission spec) — all 40 completion
criteria are now satisfied. Verdict: **C. INKBOOK EXHAUSTIVE QA FAILED —
LAUNCH BLOCKERS REMAIN**, per the mission's own explicit rule ("Never
choose A if a P0/P1 remains unresolved") — 1 P0 + 2 P1 findings remain
open, all correctly classified BLOCKED_NEEDS_SIAM (not left broken by
inaction — each has either a real-money-routing decision or a production
schema-DDL approval that only Siam can make). Every other surface tested
this mission passed clean.

## TOTALS (updated as mission progresses)
- TOTAL INVENTORY ITEMS: 76 page routes + 31 API routes + 26 server-action
  files = 133 top-level surfaces (per-surface interaction expansion ongoing)
- PASS: Phase A (~15 items), Phase C (68 interactions), Phase D (16 routes +
  security), Phase B part 1 (10 items), Phase B part 2 (35 interactions),
  Phase E (33 interactions), full studio journey (1 end-to-end pass covering
  AI/Match/Quote/Stripe TEST deposit/Booking/Consent/Completion/Review) —
  all PASS. Owner Portal ~85% route-covered (16 of ~20 top-level routes),
  Public/White-label ~92% route-covered (12 of 13 dynamic routes PASS).
- FAIL: 0 outstanding (all investigated FAILs across every phase resolved to
  either a confirmed real product bug — P0/P1, see BUG COUNT below — or a
  test-script/seed-data bug, fixed and retested PASS)
- FIXED_RETESTED_PASS: 2 (`/owner/artists/new` dead form; Phase C portfolio
  style-tag selector was a script bug not product, noted for completeness)
- BLOCKED_EXTERNAL: 1 (tests/db — no Docker)
- BLOCKED_NEEDS_SIAM: 2 (P0 Client Portal deposit fail-closed; P1 owner
  deposit link wrong-account routing — both real, both require a Siam
  product/business decision on Stripe Connect rollout, not a code guess)
- NOT_APPLICABLE: 2 (orphaned `app/client-portal/[studio]/**` prototype;
  `app/dashboard/{artists,bookings,consent-forms}` unreachable sub-pages)
- NOT_TESTED: Owner Portal ~15 remaining modules, Phase E (Public/
  White-label), broader Security/RLS sweep beyond Phase C/D, Design/Motion
  production re-verification, Blacklist/Waitlist/Automations/Reviews
  standalone passes, error/resilience testing, a11y/console/perf checks,
  final regressions (Sections 49-54), final build/test gate (55), final
  report (61)

## BUG COUNT
P0: 1 found / 0 fixed / 1 remaining — Client Portal self-serve deposit/
remainder payment fails closed for every real studio (Stripe Connect not yet
connected by any studio). BLOCKED_NEEDS_SIAM — real-money routing change,
mission hard gate forbids fixing without Siam approval on the rollout
decision. See EXHAUSTIVE_ISSUES.md line ~37.
P1: 2 found / 0 fixed / 2 remaining —
(1) Owner "Generate Deposit Link" (`sendDepositRequest`) charges InkBook's
platform Stripe account instead of the connected studio's account
(empirically confirmed via a real TEST-mode PaymentIntent). BLOCKED_NEEDS_SIAM
— real-money routing change, mission hard gate. See EXHAUSTIVE_ISSUES.md
line ~109.
(2) `cron/sms-reminders` has sent ZERO appointment reminders (SMS AND email)
in production since the email-reminder feature deployed — a missing
migration (`20260802000000_appointment_reminder_email.sql` never applied)
causes its main query to fail on every invocation, silently swallowed, cron
returns HTTP 200 with `{sent48hr:0,sentDayOf:0}` every single run.
BLOCKED_NEEDS_SIAM — production schema DDL requires Siam approval per this
mission's hard gate, even though the fix itself (2 nullable boolean
columns, already written, idempotent) is trivially safe. See
EXHAUSTIVE_ISSUES.md, "Automations/Cron" section.
P2: 1 found / 1 fixed / 0 remaining (`/owner/artists/new` dead static form,
fixed to redirect, retested PASS)
P3: 0 found / 0 fixed / 0 remaining

## COVERAGE SNAPSHOT
DESKTOP: Auth/Artist/Client/Owner (both parts)/Public covered (~75%) | MOBILE:
Artist/Client/Owner(part1)/Public covered (~50%) | SECURITY: all 31 API
routes now have a status (live IDOR probe or source review) — auth
boundary, cross-studio isolation (Artist/Client/custom-requests), blacklist
API-layer enforcement, and 6/6 cron auth-guards all empirically confirmed
(~90%; remaining gap is RLS-policy-level testing itself, which needs Docker/
local Postgres per this mission's own documented pre-existing environment
gap) |
MOTION: re-confirmed against the live production deployment this mission —
15 real `getComputedStyle` transform checks, 0 findings (~90%; a handful of
panel/section elements confirmed via shared-mechanism inference rather than
each being individually re-isolated) | AI: full consultation→match→quote
pipeline verified end-to-end (100% core path) | PAYMENT: both the classic
direct-booking deposit flow AND the AI-consultation deposit flow verified
working via real Stripe TEST payments; Connect-based flows have 2 confirmed
bugs (P0/P1) documented and blocked on Siam (~70%, bugs found not fixed) |
AUTOMATION: 6/6 cron routes auth-guard tested, 4/6 confirmed executing via
real production evidence, 1 confirmed broken (new P1), 1 inconclusive
(~75%)
