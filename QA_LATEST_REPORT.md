# InkBook QA Engine — Latest Report

**Run:** `qa-full-1788102920958` · **Mode:** `full` · **Started:** 2026-08-30T15:15:20.958Z · **Completed:** 2026-08-30T15:53:11.105Z

## Totals

| PASS | FAIL | BLOCKED_NEEDS_SIAM | SKIPPED |
|---|---|---|---|
| 50 | 1 | 2 | 1 |

## preflight

4 PASS, 0 FAIL, 1 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Production reachable (https://www.inkbook.tech) | ✅ PASS | 1s |  |
| cron/sms-reminders migration gate (known blocker) | 🚧 BLOCKED_NEEDS_SIAM | 1s | Exit code 2 |
| TypeScript typecheck | ✅ PASS | 14s |  |
| ESLint | ✅ PASS | 9s |  |
| Schema/migration probe (verify-migrations.mjs) | ✅ PASS | 4s |  |

## qa-data

2 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| QA data write/delete probe (service-role access) | ✅ PASS | 3s |  |
| Seed persistent full-mode studio (real signup, shared by owner/artist/flagship/mobile full-mode scripts) | ✅ PASS | 33s |  |

## owner

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Owner Portal full real-browser click-through | ✅ PASS | 256s |  |

## artist

18 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Artist Dashboard data correctness | ✅ PASS | 1s |  |
| Artist Earnings booking/payment integration | ✅ PASS | 1s |  |
| Artist Earnings cross-studio isolation | ✅ PASS | 7s |  |
| Artist Schedule date navigation + booking integration | ✅ PASS | 12s |  |
| Artist Schedule timezone + lifecycle | ✅ PASS | 12s |  |
| Artist Schedule cross-studio isolation | ✅ PASS | 7s |  |
| Provision disposable artist-isolation fixture | ✅ PASS | 5s |  |
| Artist Bookings null date/time regression | ✅ PASS | 11s |  |
| Artist Requests authorization + lifecycle | ✅ PASS | 21s |  |
| Artist Requests cross-studio isolation | ✅ PASS | 24s |  |
| Artist Clients isolation + integration | ✅ PASS | 43s |  |
| Artist Portfolio isolation + integration | ✅ PASS | 13s |  |
| Artist Flash lifecycle-guard + isolation | ✅ PASS | 5s |  |
| Artist Messages isolation | ✅ PASS | 53s |  |
| Artist Agreements creation + isolation + immutability | ✅ PASS | 42s |  |
| Compliance audit log | ✅ PASS | 5s |  |
| Clean up disposable artist-isolation fixture | ✅ PASS | 10s |  |
| Artist Portal full real-browser click-through | ✅ PASS | 207s |  |

## client

8 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Client Portal My Bookings | ✅ PASS | 21s |  |
| Client Portal History | ✅ PASS | 29s |  |
| Client Portal Settings | ✅ PASS | 6s |  |
| Client <-> Studio messaging | ✅ PASS | 12s |  |
| Booking lifecycle completion | ✅ PASS | 38s |  |
| Remaining balance payment | ✅ PASS | 15s |  |
| Reviews | ✅ PASS | 16s |  |
| Waitlist | ✅ PASS | 11s |  |

## flagship

1 PASS, 1 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Flagship journey — right-sized live regression | ✅ PASS | 18s |  |
| Flagship journey — full, real Stripe TEST payment (success/decline/cancel) | ❌ FAIL | 272s | Exit code 1 |

## security

10 PASS, 0 FAIL, 0 BLOCKED, 1 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| tests/db — RLS isolation + schema integrity (real Postgres) | ⏭️ SKIPPED |  | Requires a local Supabase instance (`supabase start`) — SUPABASE_DB_URL not set. Run manually with `npm run test:db` after starting one, or let CI (.github/workflows/test.yml) run it automatically. |
| GET /api/bookings cross-tenant IDOR (BUG-SEC-FULLQA-001, P0) | ✅ PASS | 9s |  |
| submitCustomRequest cross-tenant artist assignment (BUG-SEC-FULLQA-003, P1) | ✅ PASS | 12s |  |
| Public AI routes private-knowledge exposure (BUG-SEC-FULLQA-002, P2) | ✅ PASS | 13s |  |
| Cross-artist + cross-client isolation | ✅ PASS | 16s |  |
| Custom-requests quote/decline/schedule IDOR (legacy sweep) | ✅ PASS | 15s |  |
| sendDepositRequest ownership check | ✅ PASS | 5s |  |
| File upload 3-layer validation | ✅ PASS | 0s |  |
| AI endpoint rate limiting | ✅ PASS | 0s |  |
| No customer PII in logs (billing webhook) | ✅ PASS | 1s |  |
| Stripe Connect payment reconciliation (idempotency, cross-account rejection, 0% fee) | ✅ PASS | 208s |  |

## edge-cases

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Error/resilience sweep — malformed IDs, double-submit, nonexistent routes | ✅ PASS | 38s |  |

## mobile

2 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Mobile critical path (390x844, real taps) | ✅ PASS | 116s |  |
| Design/motion objective regression (getComputedStyle transforms) | ✅ PASS | 59s |  |

## automations

0 PASS, 0 FAIL, 1 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Cron auth-guard (6 routes) + organic production-evidence check | 🚧 BLOCKED_NEEDS_SIAM | 8s | Exit code 2 |

## known-bug-regression

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Locked known-bug regression suite (8 files) | ✅ PASS | 6s |  |

## final-regression

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Final regression — flagship journey re-run | ✅ PASS | 18s |  |

## cleanup

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| QA data cleanup sweep (dry-run -> verify -> delete -> verify gone) | ✅ PASS | 10s |  |

## Failures requiring attention

### Flagship journey — full, real Stripe TEST payment (success/decline/cancel)
**Reason:** Exit code 1
```
(node:17128) Stripe: We recommend building your integration using Accounts v2. See https://docs.stripe.com/api/v2/core/accounts
(Use `node --trace-warnings ...` to show where the warning was created)

```

## BLOCKED_NEEDS_SIAM

- **cron/sms-reminders migration gate (known blocker)** — Exit code 2
- **Cron auth-guard (6 routes) + organic production-evidence check** — Exit code 2

---
*Generated by the InkBook QA Engine (`npm run qa:inkbook`). See QA_ENGINE.md for architecture and qa/manifest.json for full test surface coverage.*