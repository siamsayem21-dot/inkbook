# InkBook — Deferred Issues

Issues that cannot be safely completed autonomously, or that are intentionally out of scope for the 8-Phase V1 Completion Mission. Each entry says *why* it's deferred and what would unblock it.

---

## 1. State-specific tattoo consent legal text
**Phase:** 3. **Status:** deferred, not started.
US tattoo-consent law varies by state (minimum age with/without guardian consent, required disclosures, some states ban minor tattoos outright regardless of consent). The current consent form (`components/booking/ConsentForm.tsx`) uses one generic guardian-consent flow for all states.
**Why deferred:** this is legal content, not code. Fabricating state-by-state legal thresholds without a verified legal source would create real liability for studios using the platform. Not something to guess at autonomously.
**Unblock:** Siam supplies verified per-state requirements (or a licensed legal source) to encode.

## 2. Wildcard subdomain routing (`studioname.inkbook.tech`)
**Phase:** 2/4 (white-label). **Status:** deferred, not started.
Per `DEPLOY.md`, this requires a wildcard DNS entry + Vercel Pro custom domain config — infrastructure, not app code. Current white-labeling is path-based (`inkbook.tech/book/[studio]`), which is fully functional for V1 and was treated as sufficient in earlier phases.
**Unblock:** Siam decides whether/when to add the wildcard domain + DNS in Vercel; app code (studio resolution) would need only a small middleware change once the domain exists.

## 3. 1% Stripe platform transaction fee — build vs. deploy gate
**Phase:** 6. **Status:** being built this session, **held from merge/deploy**.
CLAUDE.md explicitly requires Siam approval before any Stripe/payment change reaches production. This is a change to live money flow across every studio's Stripe charges — genuinely irreversible once deployed (past charges can't be retroactively fee-adjusted). Building and testing it does not require a gate; merging to `master` and deploying does.
**Unblock:** Siam reviews the branch/PR and approves merge + deploy.

## 4. Orphaned `app/client-portal/**` prototype
**Phase:** 7 (cleanup, not a completion blocker). **Status:** identified, not removed.
Single-commit (`410863d`) mock-data prototype for the client portal, fully superseded by the real, live `app/portal/[studio]/**` built across Phase C. Confirmed zero references anywhere else in the codebase (`grep` for `client-portal` only self-matches inside the directory). Not a working feature — dead weight, not a locked module.
**Why deferred:** deleting ~30 files is a moderately destructive action outside this mission's explicit scope (net-new V1 features), even though the risk of breaking anything is effectively zero.
**Unblock:** Siam confirms it's safe to delete, or it's picked up as a dedicated cleanup task.

## 5. Migration drift — `client_accounts.phone`/`client_accounts.dob` (carried over, pre-existing)
**Phase:** N/A (infra). **Status:** unresolved, low priority — unchanged from before this session.
`20260809000000_client_accounts_phone_dob.sql` exists in the repo but was never applied to production. Nothing in the app currently reads either column (My Profile renders their absence gracefully). Confirmed still true.
**Unblock:** Siam confirms whether/when to apply the migration.

## 6. CI Stripe secrets gap (carried over, pre-existing)
**Phase:** N/A (infra). **Status:** unresolved, low priority — unchanged from before this session.
`tests/e2e/owner-workflow.spec.ts` fails in GitHub Actions because `STRIPE_TEST_SECRET_KEY`/`STRIPE_TEST_PUBLISHABLE_KEY` are not configured as repo secrets. Confirmed identical failure signature across many consecutive master pushes, unrelated to any app code.
**Unblock:** Siam adds the two Stripe test-mode secrets to the GitHub repo.

---

## Explicitly NOT deferred (checked and found already complete this session)
- Client ID photo verification — already captured at consent-form step (Phase 3), gates a completed booking.
- Blacklist enforcement, waitlist auto-promote/cap, session-agreement↔booking linking, remainder payment collection — all confirmed live in code (see MASTER_PLAN.md Phase 5). PHASE1.md's gap list describing these as missing is stale (dated 2026-06-22).
- Advanced revenue analytics — 6-month trend chart already live on `/owner/revenue`; "MRR trend" language in PHASE1.md was platform-level (Siam's own business), out of scope for a per-studio dashboard.
