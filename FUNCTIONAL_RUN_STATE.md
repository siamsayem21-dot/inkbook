# Functional QA — Run State

**Mission:** Full ground-up strict functional real-user QA + autonomous fix loop (Siam explicitly requested full re-run, 2026-08-29, even though an equivalent mission completed clean 3 days prior on this identical codebase — HEAD still `2ffd160`, 0 commits between).

**Started:** 2026-08-29
**Target:** production, `https://www.inkbook.tech` (Stripe TEST mode only, QA-tagged data only)

## Known state entering this run (from prior mission, to be independently re-verified, not trusted blindly)
- P0 (client self-serve deposit raw error) — reported fixed 2026-08-26, commit `4ee18db`. **Re-verify.**
- P1 (owner deposit link → platform account instead of studio) — reported fixed 2026-08-26, same commit. **Re-verify.**
- P1 (`cron/sms-reminders` migration `20260802000000_appointment_reminder_email.sql` not applied) — **confirmed STILL NOT APPLIED** via live REST probe just now (`column bookings.email_48hr_sent does not exist`, 2026-08-29). Still BLOCKED_NEEDS_SIAM — no DB/DDL connection available to this session, same constraint as before.
- Architectural gap flagged, not fixed: webhook doesn't cross-check originating Stripe account vs studio's connected account id.

## QA identity plan
Fresh QA studio + owner + 2 artists + clients created via real signup UI, tagged `[QA-SEED-FULLQA-20260829]`, cleaned up at mission end after a dry-run.

## Phase log
- [x] Phase 0 — Setup + QA studio seed
- [x] Phase 1 — Owner Portal (full click-through)
- [x] Phase 2 — Artist Portal (full click-through) — 68 actions tested (artist1 + artist2), 68 PASS, 0 FAIL, 0 BLOCKED, 0 new bugs. Isolation probes (cross-artist and cross-studio) all clean. Confirmed as intentional, not a gap: no Cancel Booking action in Artist Portal (Owner-Portal-only by design). See `scripts/qa-fullrun-artist-clickthrough.mjs`.
- [x] Phase 3 — Public + Client Portal flagship journey — 49/53 PASS (3 explained non-bugs, 1 N/A), 0 BLOCKED. Real Stripe TEST payment success/decline/cancel + webhook reconciliation verified. Artist Match verified correct on live AI-refined path. 2 real bugs found: (1) artist-match case-sensitivity (P3 after correction, fallback-path only), (2) guest-consultation portal reconciliation gap (P2) — both fixed uncommitted in `lib/artist-match.ts` / `lib/client-portal/reconcile-guest-consultations.ts` + `app/portal/[studio]/layout.tsx`. Coordinator review of fix #2 found and fixed a second real bug in the fix itself (ILIKE wildcard cross-client leak) — see FUNCTIONAL_BUG_LOG.md correction. Cross-client isolation probe clean. Dangling Stripe Connect test state from crashed script iterations found and fully reverted.
- [x] Phase 4 — API/security IDOR sweep + Mobile viewport critical paths — COMPLETE.
  - **Job D continuation (full inventory sweep):** all 34 `app/api/**/route.ts` routes and all 24 server-action files now accounted for (re-verified counts — prior "~31" was stale). Method: 2 parallel read-only code audits + targeted live retests for anything flagged. Found 1 new real bug: **BUG-SEC-FULLQA-003** (P1, `submitCustomRequest` in `app/book/[studio]/custom/actions.ts` wrote a cross-tenant `custom_requests.artist_id` and emailed an unrelated studio's artist the client's PII when a forged `artistId` was submitted) — fixed uncommitted, retested live against local dev (2 runs: 1 negative-control FAIL against a stale un-reloaded dev server, 1 PASS after a clean restart — noting dev-server hot-reload is NOT reliable for edited server actions, a process gotcha for future sessions), regression-checked against the real form's legitimate flow (still works). Everything else: 0 new findings, all correctly scoped. `app/api/ai/artist-match/route.ts` was initially missed by the audit agent's file list — caught and closed by the coordinator directly: SAFE_BY_DESIGN (only returns data already public via the studio's own `/book/[studio]` pages).
  - **Webhook cross-check re-confirmation (code-read only, not live-exploited, per mission scope):** `app/api/stripe/webhook/route.ts` still has NO cross-check between the incoming event's Stripe account and the studio's own connected account id — confirmed unchanged from the prior mission's flagged gap (out of scope to fix, real-money trust-boundary change needs Siam sign-off). Signature verification: confirmed intact, no bypass path.
  - **Job E (mobile viewport, 390x844, real taps, production):** 14 actions run via `scripts/qa-fullrun-mobile-critical-paths.mjs` — 9 clean PASS, 2 test-script false negatives (price/deposit-link genuinely render correctly but in `<input value>` attributes invisible to `innerText` scraping — not bugs), 1 non-reproducible flake (Stripe checkout navigation failed once, reproduced cleanly twice on retry — not a confirmed bug), 1 legitimate skip (consent form, downstream of the flake), 1 real-but-narrow finding (mobile portal hamburger nav becomes unreachable with the QA session's own 48-char tagged studio name, but confirmed NOT reproducible with any realistic real-world studio name up to 38 chars tested — logged as a low-priority CSS hardening note, not a bug). 0 confirmed new product bugs from Job E. Also found + cleaned up one fully orphaned QA record set left over from an earlier (pre-this-session) interrupted Job E attempt.
  - All QA data from this phase self-cleaned (Stripe Connect test account created+deleted, studio's `stripe_connected_account_id` reverted to its original null, all seeded consultations/bookings/deposit_payments/consent_forms/client_accounts/auth users removed) — verified via direct DB reads, not just trusted from script exit codes.
- [x] Phase 5 — Automations/cron re-verify — all 6 cron routes: auth guard PASS (401 on missing/wrong bearer, 12/12 checks). Real authenticated invocation attempted but blocked: `.env.local` `CRON_SECRET` is present as a key but its value is an empty string (not a working secret — confirmed by direct read, not assumed) — same constraint as the prior mission. Fell back to the prior mission's organic-evidence method (fresh re-run): `cancel-expired` (11 real rows), `no-show` (16 rows + 1 audit_log entry), `payment-reminders` pass 1 (10 rows) all confirmed genuinely executing on schedule; `payment-reminders` pass 2 and `review-requests` have 0 organic evidence yet (not a failure — plausibly not yet eligible pre-launch, code-read confirms correct logic); `waitlist-notify` (1 row) confirmed. **`sms-reminders` RE-CONFIRMED STILL BROKEN** — `email_48hr_sent does not exist`, same P1, not re-logged as new, still BLOCKED_NEEDS_SIAM (migration `20260802000000_appointment_reminder_email.sql` not applied). Once-daily cadence cap (`DEFERRED_ISSUES.md` #7) reconfirmed unchanged. Housekeeping: found + cleaned 4 leftover QA bookings/clients from this session's own Phase 4 that weren't actually cleaned despite Phase 4 claiming full self-clean (fake `.test`/test-phone data, zero real-customer exposure). 0 new product bugs. Scripts: `scripts/qa-fullrun-cron-precheck.mjs`, `qa-fullrun-cron-realinvoke.mjs` (ready, blocked on empty secret), `qa-fullrun-cron-organic-evidence.mjs`, `qa-fullrun-cron-cleanup-phase4-leftovers.mjs`. See `FUNCTIONAL_TEST_MATRIX.md` CRON-001..014.
- [x] Phase 6 — Final regression + report + QA data cleanup — COMPLETE.
  - Full suite re-run with all 6 uncommitted fixes in place: typecheck clean, lint clean, `npm run test` 56/56 files / 604/604 tests pass (fixed 3 new test files that had a missing-mock bug, added real regression coverage for the knowledge-leak fix), `npm run build` compiled successfully, all routes generated, exit 0.
  - All QA data created this mission (1 studio, 2 artists, 15 clients, 14 bookings, 10 consultations, 1 custom request, 13 client_accounts, 17 auth users, plus everything created/self-cleaned mid-phase by each job) verified fully removed via direct DB queries — 0 remaining. Unrelated leftover auth-only users from prior, older QA missions (pre-dating this run) were found but deliberately left untouched — out of this mission's scope.
  - See FULLQA_FINAL_REPORT_20260829.md for the full final report and verdict.

---

## Pre-Deploy Reconciliation (2026-08-30)

Siam flagged an apparent contradiction between the security-phase table
("4 real cross-tenant leaks found, 3 fixed") and the final summary ("5 real
bugs found and fixed"). Root cause: those two numbers were counting
different things — the phase table counted leak *rows/probes* from the
dedicated Phase 4 sweep only, the summary counted *all* bugs (security +
non-security) across the whole mission, and neither line clearly separated
"security/privacy leaks" from "functional bugs." Full reconciliation done;
see the chat transcript / commit history for the itemized breakdown of all
4 true security/privacy findings, all confirmed FIXED_AND_RETESTED, 0
STILL_UNRESOLVED.

Additional work done during reconciliation:
- Found and fixed a stale/broken local dev server (was returning HTTP 500
  even for a nonexistent studio slug — a stale hot-reload artifact, not a
  regression) by restarting it cleanly.
- Made `scripts/qa-fullrun-security-custom-request-idor-retest.mjs`
  self-contained (it depended on the shared QA studio manifest, which had
  already been fully deleted during the prior session's final cleanup).
- Added real DB-level regression coverage (`tests/unit/reconcile-guest-consultations.test.ts`)
  for the ILIKE-wildcard fix, which previously only had a pure-logic
  verification, not an actual mocked-DB round-trip.
- Re-ran all 4 security retests, a dedicated cross-artist + cross-client
  isolation probe (`scripts/qa-reconcile-isolation-recheck.mjs`), and a
  right-sized flagship-chain regression (`scripts/qa-reconcile-flagship-regression.mjs`)
  — all clean, 0 findings, against the local dev server running the
  current uncommitted working tree.
- Re-confirmed `cron/sms-reminders` migration still not applied (read-only
  probe, not touched).
- Confirmed via `git status`/`git diff` that all 6 original code fixes are
  still present and unchanged, nothing committed, nothing discarded.

**SECURITY RECONCILIATION: ALL FOUND LEAKS FIXED AND RETESTED.**
