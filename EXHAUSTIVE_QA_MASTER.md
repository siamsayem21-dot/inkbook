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
Portal) — DONE. Phase B (Owner Portal) — PARTIAL (Artists + Settings only;
~15 modules remain: Bookings, Consultations, Pipeline, Requests, Messages,
Flash, Portfolio, Clients, Revenue, Reviews, Blacklist, Consent Forms,
Waitlist, Knowledge, Audit Log, Billing). Core cross-role journey
(`qa-full-studio-journey.mjs`: AI Consultation → AI Artist Match → Quote →
Stripe TEST Deposit → Booking → Consent → Completion → Review) — DONE, PASS
end-to-end. Now resuming Phase B part 2 (remaining Owner modules).

## CURRENT ROLE / ROUTE / STATE / ACTION
OWNER | about to start | `/owner/bookings` (list + detail) as the first
module of Phase B part 2.

## LAST VERIFIED ITEM
Phase D (Client Portal) fully documented: `PRODUCT_COVERAGE_MATRIX.md`
Client Portal route rows all PASS, `INTERACTION_COVERAGE.md` Phase D section
populated with 16 detailed interaction rows + security summary.

## NEXT EXACT ITEM
Write/run `scripts/qa-phase-b-owner-part2.mjs` covering the ~15 remaining
Owner Portal modules listed above, using the same real-click → DB re-query →
honest-FAIL-investigation methodology as Phases B/C/D. Start with Bookings
and Consultations/Pipeline (highest-traffic, already touched indirectly by
the P0/P1 findings and the full studio journey, so cross-check those areas
carry over cleanly) then continue to the rest of the list. After Phase B
part 2: Phase E (Public/White-label), then Security/RLS broad sweep, then
Design/Motion production re-verification, then final regressions + report.

## TOTALS (updated as mission progresses)
- TOTAL INVENTORY ITEMS: 76 page routes + 31 API routes + 26 server-action
  files = 133 top-level surfaces (per-surface interaction expansion ongoing)
- PASS: Phase A (~15 items), Phase C (68 interactions), Phase D (16 routes +
  security), Phase B part 1 (10 items), full studio journey (1 end-to-end
  pass covering AI/Match/Quote/Stripe TEST deposit/Booking/Consent/
  Completion/Review) — all PASS
- FAIL: 0 outstanding (all Phase D FAILs investigated: 2 confirmed real
  product bugs — see BUG COUNT below — rest were test-script/seed-data bugs,
  fixed, retested PASS)
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
P1: 1 found / 0 fixed / 1 remaining — Owner "Generate Deposit Link"
(`sendDepositRequest`) charges InkBook's platform Stripe account instead of
the connected studio's account (empirically confirmed via a real TEST-mode
PaymentIntent). BLOCKED_NEEDS_SIAM — same hard gate. See EXHAUSTIVE_ISSUES.md
line ~109.
P2: 1 found / 1 fixed / 0 remaining (`/owner/artists/new` dead static form,
fixed to redirect, retested PASS)
P3: 0 found / 0 fixed / 0 remaining

## COVERAGE SNAPSHOT
DESKTOP: Auth/Artist/Client/Owner-Artists+Settings covered (~50%) | MOBILE:
Artist + Client covered, Owner Artists+Settings covered (~40%) | SECURITY:
Auth boundary + Artist cross-studio isolation + Client IDOR probes covered,
broader Owner-side API/action authorization sweep still pending (~40%) |
MOTION: prior design-correction pass verified pre-mission, NOT yet
re-confirmed against the live production deployment this mission (0% this
mission) | AI: full consultation→match→quote pipeline verified end-to-end
(100% core path) | PAYMENT: classic direct-booking deposit flow verified
working via real Stripe TEST webhook; Connect-based flows have 2 confirmed
bugs (P0/P1) documented and blocked on Siam (~60%, bugs found not fixed) |
AUTOMATION: not yet started (0%)
