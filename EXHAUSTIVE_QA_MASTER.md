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
Phase A (Auth) — DONE. Phase C (Artist Portal) — DONE. Phase D (Client
Portal) — DONE. Phase B (Owner Portal) — DONE (Part 1 + Part 2, 45
interactions total, 0 real findings). Phase E (Public/White-label) — DONE
(33 interactions, 0 real findings, including the first real-Stripe-TEST-
payment test of the classic direct-booking flow). Automations/Cron — DONE
(6/6 routes auth-guard tested; 4/6 confirmed genuinely executing via real
production evidence; 1 NEW REAL P1 BUG FOUND — cron/sms-reminders has been
sending zero reminders since a migration was never applied; 1 route
inconclusive pending real-world data). Core cross-role journey
(`qa-full-studio-journey.mjs`: AI Consultation → AI Artist Match → Quote →
Stripe TEST Deposit → Booking → Consent → Completion → Review) — DONE, PASS
end-to-end. Remaining known gaps (deliberately not blocking, tracked as
NOT_TESTED, not re-litigated): `/owner/dashboard`, `/owner/consultations`
(list view specifically), `/owner/artists/[artistId]`, `/owner/requests/[id]`
(standalone detail page), `/owner/messages/[threadId]`,
`/book/[studio]/consult` (reachability from the live UI unconfirmed — the
"Start AI Consultation" CTAs all link to `/login` instead), real 6-digit OTP
code entry through the public login UI (no test-inbox access — underlying
mechanism covered by Phase A/D via cookie-injection), direct authenticated
testing of `cron/payment-reminders` pass 2 / `cron/review-requests` /
`cron/waitlist-notify` (correct production `CRON_SECRET` not obtainable in
this session — see EXHAUSTIVE_ISSUES.md).

## CURRENT ROLE / ROUTE / STATE / ACTION
Security/RLS sweep — systematic API authorization inventory done (source
review of every remaining unaudited API route + one live cross-studio IDOR
probe). Transitioning next to Design/Motion production re-verification.

## LAST VERIFIED ITEM
Security/RLS sweep complete: every one of the 31 top-level API routes now
has a PASS/FAIL/NOT_APPLICABLE status in `PRODUCT_COVERAGE_MATRIX.md` (no
remaining NOT_TESTED API routes) — covered either through earlier
functional phases, a live cross-studio IDOR probe
(`scripts/qa-phase-security-idor.mjs`, 12 checks against
`custom-requests/[id]/{quote,decline,schedule}` — real cross-studio owner/
artist attacks correctly rejected 403, unauthenticated rejected 401,
positive control proves the session mechanism itself works, 0 findings), or
a direct source review for the remaining low-risk routes (all confirmed to
derive `studio_id`/`owner_id` server-side from the authenticated session or
a validated lookup, never from client-supplied IDs). One dead-code
observation noted (`/api/reminders` — CRON_SECRET-gated but not registered
in `vercel.json`, superseded by `cron/sms-reminders`, inert, not a bug).
Also still fully documented from the prior session block: Automations/Cron
(4/6 PASS via real production evidence, 1 real NEW P1 bug found —
cron/sms-reminders silently sending zero reminders since a migration was
never applied — BLOCKED_NEEDS_SIAM, 1 inconclusive) and Phase E (Public/
White-label, 33 interactions, 0 findings, including the mission's first
real-Stripe-TEST-payment test of the classic direct-booking flow).

## NEXT EXACT ITEM
Design/Motion production re-verification — `DESIGN_MOTION_COVERAGE.md`
still has entries marked "RE-VERIFY" from before this mission (the
correction-pass design work was verified once already, pre-mission, on a
Preview deployment, then merged/deployed to production via "deploy kro" —
this mission has not yet re-confirmed the live production site still shows
the same real depth/motion/hover behavior). Then: error/resilience testing
(refresh mid-flow, malformed IDs, network failures), a11y/console/perf
checks, final regressions (Sections 49-54), final report (Section 61) —
verdict will very likely be "C. LAUNCH BLOCKERS REMAIN" per the mission's
own rule against choosing "A" while P0/P1 remain unresolved, unless Siam
resolves the Stripe Connect rollout decision and approves the
cron/sms-reminders migration first.

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
MOTION: prior design-correction pass verified pre-mission, NOT yet
re-confirmed against the live production deployment this mission (0% this
mission) | AI: full consultation→match→quote pipeline verified end-to-end
(100% core path) | PAYMENT: classic direct-booking deposit flow verified
working via real Stripe TEST webhook; Connect-based flows have 2 confirmed
bugs (P0/P1) documented and blocked on Siam (~60%, bugs found not fixed) |
AUTOMATION: not yet started (0%)
