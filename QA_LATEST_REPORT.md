# InkBook QA Engine — Latest Report

**Run:** `qa-critical-1788090585459` · **Mode:** `critical` · **Started:** 2026-08-30T11:49:45.459Z · **Completed:** 2026-08-30T11:53:44.794Z

## Totals

| PASS | FAIL | BLOCKED_NEEDS_SIAM | SKIPPED |
|---|---|---|---|
| 25 | 0 | 2 | 9 |

## preflight

3 PASS, 0 FAIL, 1 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Production reachable (https://www.inkbook.tech) | ✅ PASS | 0s |  |
| cron/sms-reminders migration gate (known blocker) | 🚧 BLOCKED_NEEDS_SIAM | 1s | Exit code 2 |
| TypeScript typecheck | ✅ PASS | 8s |  |
| ESLint | ✅ PASS | 5s |  |

## qa-data

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| QA data write/delete probe (service-role access) | ✅ PASS | 2s |  |

## owner

0 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

## artist

6 PASS, 0 FAIL, 0 BLOCKED, 8 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Artist Dashboard data correctness | ✅ PASS | 1s |  |
| Artist Earnings booking/payment integration | ✅ PASS | 1s |  |
| Artist Earnings cross-studio isolation | ✅ PASS | 6s |  |
| Artist Schedule date navigation + booking integration | ✅ PASS | 9s |  |
| Artist Schedule timezone + lifecycle | ✅ PASS | 9s |  |
| Artist Schedule cross-studio isolation | ✅ PASS | 6s |  |
| Artist Bookings null date/time regression | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |
| Artist Requests authorization + lifecycle | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |
| Artist Requests cross-studio isolation | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |
| Artist Clients isolation + integration | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |
| Artist Portfolio isolation + integration | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |
| Artist Flash lifecycle-guard + isolation | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |
| Artist Messages isolation | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |
| Artist Agreements creation + isolation + immutability | ⏭️ SKIPPED |  | Requires local dev server (localhost:3001) + a specific hardcoded studio fixture, not confirmed safe against production — see QA_ENGINE.md 'Known gaps'. |

## client

8 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Client Portal My Bookings | ✅ PASS | 17s |  |
| Client Portal History | ✅ PASS | 21s |  |
| Client Portal Settings | ✅ PASS | 5s |  |
| Client <-> Studio messaging | ✅ PASS | 10s |  |
| Booking lifecycle completion | ✅ PASS | 31s |  |
| Remaining balance payment | ✅ PASS | 13s |  |
| Reviews | ✅ PASS | 15s |  |
| Waitlist | ✅ PASS | 9s |  |

## flagship

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Flagship journey — right-sized live regression | ✅ PASS | 18s |  |

## security

4 PASS, 0 FAIL, 0 BLOCKED, 1 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| tests/db — RLS isolation + schema integrity (real Postgres) | ⏭️ SKIPPED |  | Requires a local Supabase instance (`supabase start`) — SUPABASE_DB_URL not set. Run manually with `npm run test:db` after starting one, or let CI (.github/workflows/test.yml) run it automatically. |
| GET /api/bookings cross-tenant IDOR (BUG-SEC-FULLQA-001, P0) | ✅ PASS | 7s |  |
| submitCustomRequest cross-tenant artist assignment (BUG-SEC-FULLQA-003, P1) | ✅ PASS | 12s |  |
| Public AI routes private-knowledge exposure (BUG-SEC-FULLQA-002, P2) | ✅ PASS | 10s |  |
| Cross-artist + cross-client isolation | ✅ PASS | 13s |  |

## edge-cases

0 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

## mobile

0 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

## automations

0 PASS, 0 FAIL, 1 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Cron auth-guard (6 routes) + organic production-evidence check | 🚧 BLOCKED_NEEDS_SIAM | 7s | Exit code 2 |

## known-bug-regression

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| Locked known-bug regression suite (8 files) | ✅ PASS | 3s |  |

## final-regression

0 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

## cleanup

1 PASS, 0 FAIL, 0 BLOCKED, 0 SKIPPED

| Check | Status | Duration | Note |
|---|---|---|---|
| QA data cleanup sweep (dry-run -> verify -> delete -> verify gone) | ✅ PASS | 2s |  |

## BLOCKED_NEEDS_SIAM

- **cron/sms-reminders migration gate (known blocker)** — Exit code 2
- **Cron auth-guard (6 routes) + organic production-evidence check** — Exit code 2

---
*Generated by the InkBook QA Engine (`npm run qa:inkbook`). See QA_ENGINE.md for architecture and qa/manifest.json for full test surface coverage.*