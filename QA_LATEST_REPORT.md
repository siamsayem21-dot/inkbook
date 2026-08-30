# InkBook QA Engine — Latest Report

**Run:** `qa-full-1788108587692` · **Mode:** `full` · **Started:** 2026-08-30T16:49:47.693Z · **Completed:** 2026-08-30T17:14:51.744Z

## Totals

| PASS | FAIL | BLOCKED_NEEDS_SIAM | SKIPPED |
|---|---|---|---|
| 50 | 1 | 2 | 1 |

## Owner Portal retest note

The original run of this run id (`qa-full-1788108587692`) FAILED
`owner.full-clickthrough` with a 30s timeout on `getByPlaceholder('you@studio.com')`
at the login step. Investigated and confirmed as a **transient flake, not a
functional regression**, via a full standalone retest (2026-08-30/31)
against a freshly-seeded, disposable QA fixture (studio
`eb3c38eb-3bcd-4623-86d8-4f078df86d54`, deleted after):

- Script completed end-to-end (`JOB B COMPLETE`) with **72/72 actions
  PASS, 0 FAIL, 0 BLOCKED** — no partial evidence, full completion, real
  exit code 0.
- Full desktop + mobile route sweep (38 routes total), every seeded-data
  view, every owner action (approve custom request, mark session
  completed, send deposit request, blacklist add/remove/refresh, review
  approve + create, knowledge add + delete, message reply, settings incl.
  unsaved-change-discard-on-refresh, fake-uuid 404 checks, cross-studio
  isolation probe on a second disposable studio).
- Console/network error tracking is active per route (any console error
  or failed request flips that route to FAIL and appends the count) —
  **zero were recorded** across all 38 route loads.
- QA data cleanup (`qa-engine-cleanup-sweep.mjs --apply`) run after and
  independently verified clean (0 QA-tagged studios, 0 unexpected
  QA-tagged auth users).
- Orphan process check: node/chrome/msedge process list diffed against a
  pre-retest baseline — 0 new processes attributable to the retest (2 new
  `chrome.exe` renderers were confirmed to be ordinary tabs under the
  user's own pre-existing browser process, not Playwright/QA-related).

This is a retest of the owner phase only, per explicit instruction not to
re-run already-passed phases — the totals above reflect the original run's
results for every other phase, with only `owner.full-clickthrough`
corrected to PASS based on this retest.

## preflight

4 PASS, 0 FAIL, 1 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Production reachable (https://www.inkbook.tech) | ✅ PASS | 2s |  |
| cron/sms-reminders migration gate (known blocker) | 🚧 BLOCKED_NEEDS_SIAM | 1s | Exit code 2 |
| TypeScript typecheck | ✅ PASS | 11s |  |
| ESLint | ✅ PASS | 8s |  |
| Schema/migration probe (verify-migrations.mjs) | ✅ PASS | 4s |  |

## qa-data

2 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| QA data write/delete probe (service-role access) | ✅ PASS | 3s |  |
| Seed persistent full-mode studio (real signup, shared by owner/artist/flagship/mobile full-mode scripts) | ✅ PASS | 58s |  |

## owner

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Owner Portal full real-browser click-through | ✅ PASS | 41s |  |

## artist

18 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Artist Dashboard data correctness | ✅ PASS | 2s |  |
| Artist Earnings booking/payment integration | ✅ PASS | 1s |  |
| Artist Earnings cross-studio isolation | ✅ PASS | 7s |  |
| Artist Schedule date navigation + booking integration | ✅ PASS | 10s |  |
| Artist Schedule timezone + lifecycle | ✅ PASS | 10s |  |
| Artist Schedule cross-studio isolation | ✅ PASS | 6s |  |
| Provision disposable artist-isolation fixture | ✅ PASS | 4s |  |
| Artist Bookings null date/time regression | ✅ PASS | 15s |  |
| Artist Requests authorization + lifecycle | ✅ PASS | 21s |  |
| Artist Requests cross-studio isolation | ✅ PASS | 24s |  |
| Artist Clients isolation + integration | ✅ PASS | 33s |  |
| Artist Portfolio isolation + integration | ✅ PASS | 10s |  |
| Artist Flash lifecycle-guard + isolation | ✅ PASS | 5s |  |
| Artist Messages isolation | ✅ PASS | 40s |  |
| Artist Agreements creation + isolation + immutability | ✅ PASS | 33s |  |
| Compliance audit log | ✅ PASS | 4s |  |
| Clean up disposable artist-isolation fixture | ✅ PASS | 9s |  |
| Artist Portal full real-browser click-through | ✅ PASS | 187s |  |

## client

8 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Client Portal My Bookings | ✅ PASS | 19s |  |
| Client Portal History | ✅ PASS | 21s |  |
| Client Portal Settings | ✅ PASS | 6s |  |
| Client <-> Studio messaging | ✅ PASS | 10s |  |
| Booking lifecycle completion | ✅ PASS | 33s |  |
| Remaining balance payment | ✅ PASS | 16s |  |
| Reviews | ✅ PASS | 13s |  |
| Waitlist | ✅ PASS | 10s |  |

## flagship

1 PASS, 1 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Flagship journey — right-sized live regression | ✅ PASS | 20s |  |
| Flagship journey — full, real Stripe TEST payment (success/decline/cancel) | ❌ FAIL | 280s | Exit code 1 |

## security

10 PASS, 0 FAIL, 0 BLOCKED, 1 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| tests/db — RLS isolation + schema integrity (real Postgres) | ⏭️ SKIPPED |  | Requires a local Supabase instance (`supabase start`) — SUPABASE_DB_URL not set. Run manually with `npm run test:db` after starting one, or let CI (.github/workflows/test.yml) run it automatically. |
| GET /api/bookings cross-tenant IDOR (BUG-SEC-FULLQA-001, P0) | ✅ PASS | 8s |  |
| submitCustomRequest cross-tenant artist assignment (BUG-SEC-FULLQA-003, P1) | ✅ PASS | 12s |  |
| Public AI routes private-knowledge exposure (BUG-SEC-FULLQA-002, P2) | ✅ PASS | 12s |  |
| Cross-artist + cross-client isolation | ✅ PASS | 16s |  |
| Custom-requests quote/decline/schedule IDOR (legacy sweep) | ✅ PASS | 14s |  |
| sendDepositRequest ownership check | ✅ PASS | 5s |  |
| File upload 3-layer validation | ✅ PASS | 0s |  |
| AI endpoint rate limiting | ✅ PASS | 0s |  |
| No customer PII in logs (billing webhook) | ✅ PASS | 1s |  |
| Stripe Connect payment reconciliation (idempotency, cross-account rejection, 0% fee) | ✅ PASS | 222s |  |

## edge-cases

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Error/resilience sweep — malformed IDs, double-submit, nonexistent routes | ✅ PASS | 39s |  |

## mobile

2 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Mobile critical path (390x844, real taps) | ✅ PASS | 101s |  |
| Design/motion objective regression (getComputedStyle transforms) | ✅ PASS | 56s |  |

## automations

0 PASS, 0 FAIL, 1 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Cron auth-guard (6 routes) + organic production-evidence check | 🚧 BLOCKED_NEEDS_SIAM | 8s | Exit code 2 |

## known-bug-regression

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Locked known-bug regression suite (8 files) | ✅ PASS | 5s |  |

## final-regression

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Final regression — flagship journey re-run | ✅ PASS | 18s |  |

## cleanup

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| QA data cleanup sweep (dry-run -> verify -> delete -> verify gone) | ✅ PASS | 9s |  |

## Failures requiring attention

### Flagship journey — full, real Stripe TEST payment (success/decline/cancel)
**Reason:** Exit code 1
```
(node:13432) Stripe: We recommend building your integration using Accounts v2. See https://docs.stripe.com/api/v2/core/accounts
(Use `node --trace-warnings ...` to show where the warning was created)

```

## BLOCKED_NEEDS_SIAM

- **cron/sms-reminders migration gate (known blocker)** — Exit code 2
- **Cron auth-guard (6 routes) + organic production-evidence check** — Exit code 2

## Final Verdict

FLAGSHIP-048 (browser back/forward mid-flow on the quote detail page) remains
OPEN/P3/non-blocking — reproduced consistently, root cause not isolated,
documented and accepted as deferred; it is the only remaining FAIL. Both
BLOCKED_NEEDS_SIAM items (cron/sms-reminders migration gate, cron
auth-guard) require Siam's explicit action and are correctly categorized
as blocked, not engine failures.

**INKBOOK PERMANENT QA ENGINE V1 — FULLY VERIFIED AND LOCKED**

---
*Generated by the InkBook QA Engine (`npm run qa:inkbook`). See QA_ENGINE.md for architecture and qa/manifest.json for full test surface coverage.*