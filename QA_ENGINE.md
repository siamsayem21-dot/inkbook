# InkBook QA Engine — Architecture

**One command. Three modes. Permanent, resumable, honest about what it can't cover.**

```
npm run qa:inkbook              # smoke — fast production health check (~15s)
npm run qa:inkbook -- --critical   # core Owner/Artist/Client + flagship + security + known-bug regression (~2-5 min)
npm run qa:inkbook -- --full       # everything — full click-throughs, real Stripe payment, mobile, edge cases (~1-3 hours)
```

Convenience aliases: `npm run qa:inkbook:critical`, `npm run qa:inkbook:full`.

Add `-- --fresh` to any of the above to ignore a prior incomplete run and start over.

---

## Why this exists

This project has run the same shape of QA mission — click through every
portal, probe every known IDOR, re-verify the flagship journey — more than
half a dozen times, each time from a pasted multi-page instruction, each
time writing new one-off scripts. That work was real and its results are
trustworthy, but none of it was *reusable*. This engine turns the proven
parts of that history into one command Siam can run after any future
change, without having to remember 80 script names or re-explain the
mission from scratch.

## Design principles

1. **Reuse, don't rebuild.** Every check in this engine either directly
   invokes an existing, already-proven script, or is new only where no
   suitable check existed. See "Inventory" below for the full
   KEEP/MERGE/WRAP/DEPRECATED/ONE-OFF classification of all 80+
   pre-existing QA scripts.
2. **Honest status, not forced green.** A check can be `PASS`, `FAIL`,
   `BLOCKED_NEEDS_SIAM` (a known, out-of-this-run's-control blocker — a
   migration, a decision only Siam can make), or `SKIPPED` (a genuine
   local-environment prerequisite isn't met, or a check was deliberately
   scoped out of this mode). These are never conflated. A dashboard that
   quietly turns a known blocker into "failing" trains people to ignore
   it; one that quietly turns it into "passing" is worse.
3. **Smoke/critical are fast on purpose.** They exist to be run often —
   after every deploy, ideally. Full is the exhaustive, occasional,
   release-gate command.
4. **No action this engine takes will ever run a DB migration, touch
   Stripe/payment configuration, or weaken auth/RLS.** Where a real
   product bug would require one of those to fix, the engine reports it
   and stops there — same rule this project's QA missions have followed
   throughout.

---

## TASK 1 — Inventory of existing QA infrastructure

80 pre-existing scripts under `scripts/qa-*.mjs` and `scripts/verify-*.mjs`,
plus the existing `tests/unit/**`, `tests/db/**`, and `tests/e2e/**` suites.
Nothing was deleted. Classification:

### KEEP — wired directly into the engine, unmodified logic
| Area | Scripts |
|---|---|
| Security/known-bug regression | `qa-fullrun-security-bookings-idor.mjs`, `qa-fullrun-security-custom-request-idor-retest.mjs`, `qa-fullrun-security-knowledge-leak-retest.mjs`, `qa-reconcile-isolation-recheck.mjs` |
| Flagship journey | `qa-reconcile-flagship-regression.mjs` (critical), `qa-fullrun-flagship-journey.mjs` (full) |
| Owner/Artist full click-through | `qa-fullrun-owner-clickthrough.mjs`, `qa-fullrun-artist-clickthrough.mjs` (full mode only — slow) |
| Artist Portal (production-safe, DB-level) | `verify-artist-dashboard-data.mjs`, `verify-artist-earnings-integration.mjs`, `verify-artist-earnings-isolation.mjs`, `verify-artist-schedule-nav.mjs`, `verify-artist-schedule-lifecycle.mjs`, `verify-artist-schedule-isolation.mjs` |
| Artist Portal (fixture-dependent — see "RESOLVED" below) | `verify-artist-bookings-null-schedule.mjs`, `verify-artist-requests-authz.mjs`, `verify-artist-requests-isolation.mjs`, `verify-artist-clients-isolation.mjs`, `verify-artist-portfolio-isolation.mjs`, `verify-artist-flash-isolation.mjs`, `verify-artist-messages-isolation.mjs`, `verify-artist-agreements-isolation.mjs` |
| Client Portal | `verify-client-bookings.mjs`, `verify-client-history.mjs`, `verify-client-settings.mjs`, `verify-messaging.mjs`, `verify-booking-lifecycle.mjs`, `verify-remainder-payment.mjs`, `verify-reviews.mjs`, `verify-waitlist.mjs` |
| Mobile/visual | `qa-fullrun-mobile-critical-paths.mjs`, `qa-motion-reverify-production.mjs` (full mode only) |
| Security (full mode) | `qa-phase-security-idor.mjs`, `verify-deposit-ownership.mjs`, `verify-file-upload-security.mjs`, `verify-rate-limit.mjs`, `verify-pii-logs.mjs`, `verify-audit-log.mjs`, `verify-connect-live.mjs` |
| Edge cases | `qa-phase-resilience.mjs` (full mode) |
| Automations | `qa-fullrun-cron-organic-evidence.mjs` (fixed this session — see below) |
| Preflight | `verify-migrations.mjs` (fixed this session — see below), `qa-engine-reachability-check.mjs` (new), `qa-engine-sms-reminders-migration-gate.mjs` (new) |
| Known-bug regression (unit) | `tests/unit/api-bookings.test.ts`, `tests/unit/custom-request-idor.test.ts` (new), `tests/unit/studio-knowledge-helper.test.ts`, `tests/unit/api-ai-routes.test.ts`, `tests/unit/reconcile-guest-consultations.test.ts`, `tests/unit/artist-match.test.ts`, `tests/unit/api-ai-artist-match.test.ts`, `tests/unit/artist-accept-invite.test.ts` |
| DB-level isolation | `tests/db/rls-isolation.test.ts`, `tests/db/schema-integrity.test.ts`, `tests/db/artist-bookings-isolation.test.ts`, `tests/db/artist-consultations-isolation.test.ts` (critical/full — requires local Supabase, see "Known gaps") |

### FIXED — two existing scripts had real signal-quality bugs, found and fixed while building this engine
- **`scripts/verify-migrations.mjs`** never called `process.exit()` at all — always exited 0 even with missing migrations, silently reporting PASS to any automated caller. Added `process.exit(failed > 0 ? 1 : 0)`.
- **`scripts/qa-fullrun-cron-organic-evidence.mjs`** reported the already-known, already-tracked `cron/sms-reminders` migration gap as a generic `FAIL` (exit 1) with no way for a caller to distinguish it from a genuinely new problem. Now exits `2` (this engine's `BLOCKED_NEEDS_SIAM` convention) when every finding is attributable to that one known cause; still exits `1` for anything else.

### MERGE — several overlapping scripts consolidated into one call site each
- 6 scattered `qa-fullrun-cron-*.mjs` scripts (check4/cleanup-phase4-leftovers/inventory/precheck/realinvoke/organic-evidence) → the automations phase now calls only `qa-fullrun-cron-organic-evidence.mjs` (the most complete one); the others remain in `scripts/` as historical reference/manual-debug tools, not deleted, not wired in.
- The earlier "Exhaustive QA Mission" (2026-08-26) phase scripts (`qa-phase-a-auth.mjs` through `qa-phase-e-public.mjs`, `qa-phase-a11y-console-perf.mjs`) are superseded by the 2026-08-29/30 "full ground-up re-run" scripts (`qa-fullrun-*.mjs`), which re-verified the same surfaces fresh. Kept for history, not wired in.
- `qa-full-studio-journey.mjs`, `qa-payment-routing-fix-verify.mjs` (2026-08-26 Stripe payment-routing fix verification) → superseded by `qa-reconcile-flagship-regression.mjs` and `verify-connect-live.mjs`.
- `qa-overnight-artist-sweep.mjs`, `qa-overnight-owner-sweep.mjs` (older read-only sweeps) → superseded by the fullrun click-throughs.

### WRAP — real logic, invoked as-is via child process (no logic changes)
All "KEEP" entries above are technically WRAP — the engine never inlines
their logic, it shells out to the actual script file, so a future edit to
e.g. `qa-fullrun-owner-clickthrough.mjs` is picked up automatically.

### DEPRECATED — superseded, kept for history, not wired into the engine
`qa-phase-a-auth.mjs`, `qa-phase-b-owner.mjs`, `qa-phase-b-owner-part2.mjs`,
`qa-phase-c-artist.mjs`, `qa-phase-d-client.mjs`, `qa-phase-e-public.mjs`,
`qa-phase-a11y-console-perf.mjs`, `qa-phase-cron-automations.mjs`,
`qa-overnight-artist-sweep.mjs`, `qa-overnight-owner-sweep.mjs`,
`qa-full-studio-journey.mjs`, `qa-payment-routing-fix-verify.mjs`,
`qa-fullrun-cron-check4.mjs`, `qa-fullrun-cron-cleanup-phase4-leftovers.mjs`,
`qa-fullrun-cron-inventory.mjs`, `qa-fullrun-cron-precheck.mjs`,
`qa-fullrun-cron-realinvoke.mjs`, `verify-p1-2.mjs` through `verify-p1-7.mjs`
(historical AI-consultation-module regression suite, still valid but for a
much earlier build phase).

### ONE-OFF DEBUG ONLY — investigation scripts, not general-purpose checks
`qa-bugfix-artist-invite-repro.mjs`, `-repro-preexisting-session.mjs`,
`-existing-email-repro.mjs`, `-existing-email-login-check.mjs`,
`qa-bugfix-artist-invite-full-verify.mjs` (superseded by
`qa-invite-existing-account-ux-verify.mjs`, which covers the same ground
plus the later existing-account UX fix), `qa-fullrun-append-matrix.mjs`,
`qa-fullrun-artist-agreements-recheck.mjs`, `qa-fullrun-seed-studio.mjs`,
`qa-fullrun-probe-signup.mjs`, `qa-design-system-sweep.mjs`,
`qa-motion-visual-verify.mjs`.

### RESOLVED (2026-08-30) — 9 scripts rewired onto a disposable fixture instead of real studio data
`verify-artist-bookings-null-schedule.mjs`, `verify-artist-requests-authz.mjs`,
`verify-artist-requests-isolation.mjs`, `verify-artist-clients-isolation.mjs`,
`verify-artist-portfolio-isolation.mjs`, `verify-artist-flash-isolation.mjs`,
`verify-artist-messages-isolation.mjs`, `verify-artist-agreements-isolation.mjs`,
`verify-audit-log.mjs`.

**Investigation confirmed real risk, not just ambiguity.** Both hardcoded
studio ids were checked directly against production:
- `bb0c648e-4f18-4e48-8581-6b7cfd585eea` ("SM CreationS", subdomain
  `inkandironstudio` — matches CLAUDE.md's own documented example) — its
  owner account (`mohammadsiam21@gmail.com`) signed in minutes before this
  was investigated, and it holds real bookings/clients/portfolio content.
  Genuinely ambiguous — could not be confirmed disposable.
- `5fe382a1-fee7-4387-b625-4bf7a52b8f45` ("Siam Enterprise") — **confirmed
  real**: this is the exact studio behind Siam's live P1 bug report earlier
  in this same session (the `printhutbd2019@gmail.com` invite).

Per explicit instruction, neither is touched. All 9 scripts were rewired
to read a disposable, uniquely QA-tagged fixture from
`qa/artist-fixture.json` instead — provisioned and torn down automatically
by Phase 03 every `critical`/`full` run (`scripts/qa-engine-artist-fixture.mjs`,
DRY RUN → verify QA ownership → DELETE → VERIFY GONE, same pattern as the
Phase 12 safety-net sweep). Fixed 3 additional real-data leaks the same
investigation surfaced: `OWNER_MAIL = "mohammadsiam21@gmail.com"` (a real
personal email, used to test the "studio owner" role) and
`STUDIO_A_SUBDOMAIN = "inkandironstudio"` / `STUDIO_B_SUBDOMAIN = "siam3nt"`
(real subdomains). Also fixed the `domain: "localhost"` / `secure: false`
cookie hardcoding in every script's `buildCookiesFor()` helper to derive
from `QA_BASE_URL` instead, so these now run against production (or any
target) rather than requiring a specific local dev server port.

**Verified 2026-08-30:** all 9 scripts run clean against live production
using the disposable fixture — 0 FAIL, zero real studio/client/artist data
read, written, or touched. Wired into Phase 03 (`critical`/`full` modes).

---

## TASK 2 — Master QA manifest

`qa/manifest.json` — every major test surface (route, persona, screen,
action, criticality) for Owner, Artist, Client, Public, Auth, API,
Automations, Security, Mobile. Cross-references which engine phase/check
covers it, so nothing silently disappears from QA coverage over time.

## TASK 3 — Permanent known-bug regression set

See `qa/engine/phases/10-known-bug-regression.mjs`'s
`LOCKED_REGRESSION_FILES` — 8 vitest files, every one a permanent,
deterministic, offline lock for a specific, previously-real bug:

| Bug | Locked by |
|---|---|
| Cross-studio booking IDOR (`GET /api/bookings`, P0) | `tests/unit/api-bookings.test.ts` + live probe in Security phase |
| Forged cross-tenant artist assignment (`submitCustomRequest`, P1) | `tests/unit/custom-request-idor.test.ts` (**new**) + live probe |
| Private studio knowledge exposure (public AI routes, P2) | `tests/unit/studio-knowledge-helper.test.ts` + `api-ai-routes.test.ts` + live probe |
| Guest consultation exact-email matching / ILIKE-wildcard privacy leak | `tests/unit/reconcile-guest-consultations.test.ts` |
| Artist Match case-sensitivity | `tests/unit/artist-match.test.ts` (**2 new cases added this session**) |
| Guest consultation → portal linking | `tests/unit/reconcile-guest-consultations.test.ts` (same file — the linking feature and its privacy bug are one fix) |
| Artist Invite infinite loading | `tests/unit/artist-accept-invite.test.ts` |
| Artist Invite existing-account password confusion | `tests/unit/artist-accept-invite.test.ts` (same file) + `scripts/qa-invite-existing-account-ux-verify.mjs` (real browser, full mode) |

Runs in **every mode including smoke** — it's the highest-signal, lowest-cost
check in the whole engine (<15s, fully offline, deterministic).

## TASK 4-9 — see `qa/engine/phases/*.mjs`

Each phase file's own header comment documents exactly what runs in which
mode and why. Read those directly rather than duplicating them here — the
code and the documentation would drift apart otherwise.

## TASK 10 — Master runner

`qa/engine/runner.mjs`. 13 phases, executed in dependency order:
preflight → qa-data → owner → artist → client → flagship → security →
edge-cases → mobile → automations → known-bug-regression →
final-regression → cleanup → (report, always).

---

## Run state + resume

`qa/run-state.json` (gitignored — ephemeral, local, per-machine) tracks
`runId`, `mode`, per-phase status (`running`/`completed`/`failed`/`blocked`)
and **persists each phase's full results**, so a resumed run's final
report is always complete — not just whatever ran in the resuming process.

If a run is interrupted (Ctrl+C, session limit, a crash), simply re-run
the same `npm run qa:inkbook -- --<mode>` command: it detects the
incomplete prior run of the same mode and resumes from the first
not-yet-completed phase, without re-running anything already finished.
Pass `--fresh` to force a full restart instead.

**Verified 2026-08-30**, deterministically (a hand-crafted partial
run-state, not a live-process-timing test, which is fragile): a 12-phase
run with the first 10 phases marked complete correctly resumed at phase
11, completed phases 11-13 only, and produced a final report showing all
13 phases' real results.

## Result format

- `qa/results/latest.json` — machine-readable, full detail (every check's
  status/duration/stdout/stderr tail), plus one `qa/results/<runId>.json`
  archived per run.
- `QA_LATEST_REPORT.md` — human-readable, at the repo root, regenerated
  every run.

## QA data safety

Every check the engine invokes is independently self-cleaning (the
established convention across this project's 80+ QA scripts, verified
throughout this session). `qa/engine/phases/12-cleanup.mjs` is a *second*,
independent safety net: `scripts/qa-engine-cleanup-sweep.mjs` does a
DRY RUN → re-verify QA ownership → DELETE → VERIFY GONE sweep for any
`[QA-`-tagged studio or `inkbook-qa.test`/`@example.test` auth user left
behind by a crashed check. Runs every mode. Never touches anything that
doesn't match those tag patterns.

## CI readiness

`smoke` (~15s) and `known-bug-regression` alone (<15s, offline) are both
CI-friendly today — no live production dependency beyond a reachability
check, safe to run on every PR. `critical` (~2-5 min, hits production with
QA-tagged data) is suitable for a post-deploy job, not every PR. `full`
(~1-3 hours, real Stripe TEST payments, full click-throughs) is
deliberately NOT wired into CI — it stays an explicit, human-invoked
release-gate command, per this mission's own instruction not to force an
impractical multi-hour run into mandatory CI.

---

## Known gaps / next improvements

1. ~~8 artist isolation scripts not wired in~~ — **RESOLVED 2026-08-30**,
   see "RESOLVED" above. All 9 now run against a disposable fixture, wired
   into Phase 03.
2. **No dedicated Client Portal full click-through script** exists in this
   project's history — Client coverage currently comes from the Flagship
   journey's real client-facing steps plus the `critical`-mode verify-*.mjs
   scripts. A dedicated `qa-fullrun-client-clickthrough.mjs` (mirroring
   the Owner/Artist ones) would close this gap for `full` mode.
3. **`tests/db` (RLS isolation) requires a local Supabase instance**
   (`supabase start`) — reports `SKIPPED` with a clear reason when one
   isn't running, rather than a false failure. Not fixable without either
   running Postgres locally or building a from-scratch production-safe
   equivalent (real risk: touching RLS policies in a live check is exactly
   the kind of thing this project's rules say not to improvise).
4. **Edge-case coverage is thin in `critical` mode** — `qa-phase-resilience.mjs`
   is `full`-mode only. Some edge cases (duplicate/retry, double-submit)
   are exercised incidentally by the known-bug regression tests, but a
   dedicated fast edge-case subset for `critical` doesn't exist yet.
5. **Signal handling for a live Ctrl+C interruption** wasn't tested with a
   real live kill (a background+kill attempt during this build hit a
   process-orphaning issue specific to how it was scripted, not
   necessarily reflective of a normal interactive Ctrl+C) — the resume
   *logic* itself is verified correct via the deterministic test above,
   but a real live-interruption smoke test would add confidence.
