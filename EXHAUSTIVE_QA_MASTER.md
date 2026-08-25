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
payment test of the classic direct-booking flow). Core cross-role journey
(`qa-full-studio-journey.mjs`: AI Consultation → AI Artist Match → Quote →
Stripe TEST Deposit → Booking → Consent → Completion → Review) — DONE, PASS
end-to-end. Remaining known gaps (deliberately not blocking, tracked as
NOT_TESTED, not re-litigated): `/owner/dashboard`, `/owner/consultations`
(list view specifically), `/owner/artists/[artistId]`, `/owner/requests/[id]`
(standalone detail page), `/owner/messages/[threadId]`,
`/book/[studio]/consult` (reachability from the live UI unconfirmed — the
"Start AI Consultation" CTAs all link to `/login` instead), real 6-digit OTP
code entry through the public login UI (no test-inbox access — underlying
mechanism covered by Phase A/D via cookie-injection).

## CURRENT ROLE / ROUTE / STATE / ACTION
Transitioning to the broader Security/RLS sweep — not yet started
interactively.

## LAST VERIFIED ITEM
Phase E (Public/White-label) fully documented: `PRODUCT_COVERAGE_MATRIX.md`
public-route rows + the 3 relevant action-file/API rows updated to PASS with
evidence, `INTERACTION_COVERAGE.md` Phase E section populated with 15
detailed interaction rows, `EXHAUSTIVE_ISSUES.md` has the 4 test-script
issues found/fixed during this phase (3 TEST BUG, 1 BLOCKED_EXTERNAL) plus a
summary paragraph. Notably, this phase's E4 was the mission's first
real-Stripe-TEST-payment completion of the classic (non-AI-consultation)
direct-booking flow — a genuinely different code path (webhook Branch C /
the `deposits` table) from the P0/P1 findings and from
`qa-full-studio-journey.mjs`'s own payment test (Branch A), now confirmed
working correctly end-to-end.

## NEXT EXACT ITEM
Broader Security/RLS sweep beyond what Phases A/B/C/D/E already covered
along the way (auth boundaries, cross-studio isolation, blacklist
enforcement, IDOR probes, the classic booking flow's public unauthenticated
surface) — specifically a systematic API/server-action authorization
inventory (which routes/actions verify `studio_id` ownership vs. trusting
client-supplied IDs) rather than the incidental coverage gathered so far.
Then: Design/Motion production re-verification (DESIGN_MOTION_COVERAGE.md
still has entries marked "RE-VERIFY" from before this mission),
Automations/Cron (6 `GET /api/cron/*` routes, all still NOT_TESTED), error/
resilience testing (refresh mid-flow, malformed IDs, network failures),
a11y/console/perf checks, final regressions (Sections 49-54), final report
(Section 61) — verdict will very likely be "C. LAUNCH BLOCKERS REMAIN" per
the mission's own rule against choosing "A" while P0/P1 remain unresolved,
unless Siam resolves the Stripe Connect rollout decision first.

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
