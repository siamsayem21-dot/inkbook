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

## 3. 1% Stripe platform transaction fee — cannot be built as scoped; deeper gap found underneath it
**Phase:** 6. **Status:** investigated, NOT built — this is bigger than a fee, see below. **Requires a Siam product/architecture decision, not just an approval.**

Started to build this as a small addition (`application_fee_amount` on the existing deposit/remainder Stripe Checkout session in `lib/stripe/deposit-checkout.ts`). Stopped once the code audit showed why that's the wrong fix:

**`application_fee_amount` only means anything inside Stripe Connect** — it splits a charge between the platform and a *connected account*. This codebase has **no Stripe Connect integration at all** (confirmed by grep: zero matches for `stripe.accounts`, `connected_account`, any per-studio `stripe_account_id`, `stripe.transfers`, or any `payout` concept anywhere in `app/` or `lib/`). Every client deposit and remainder payment goes through one single Checkout Session against InkBook's own central Stripe account (`STRIPE_SECRET_KEY`) — the same account used for the owner-facing subscription billing (Solo/Studio/Pro plans). There is currently **no code path that moves any of that client payment money to a studio at all.**

So the real gap isn't "add 1%" — it's: **studios have no way to receive the tattoo-deposit/remainder money their own clients pay through the platform.** Bolting `application_fee_amount` onto the current single-account checkout would not compute a fee against anything (there's no connected account to split from) and risks either a Stripe API error or, worse, silently doing nothing while looking like it works.

**Why this needs Siam, not autonomous code:** this is a payment-architecture decision with real compliance and money-movement consequences (who is the merchant of record, KYC requirements, payout timing, chargeback liability) — squarely the kind of "Stripe/payment change" CLAUDE.md requires approval for, and beyond that, it's a product decision about how InkBook actually gets paid, not a bug.

**Options for Siam to choose between** (not a recommendation to build any of these unilaterally):
- **Stripe Connect** (separate accounts, KYC per studio) — the standard way to run this exact business model (platform takes a cut, connected merchants get the rest). Real onboarding/KYC work; the `stripe:connect-recommend` and `stripe:connect-required-verification-information` skills exist specifically to scope this.
- **Manual payouts** (Siam/InkBook holds all funds, reconciles and pays studios out-of-band, e.g. monthly ACH/check) — no Connect needed, but doesn't scale past a handful of studios and has no code support today either (would still need a "studio balance owed" ledger).
- **Fee-only, no split** — track a 1% "fee" figure for reporting purposes without actually moving money differently, if Siam's actual near-term plan is to keep collecting 100% into the platform account regardless. Cheapest to build, but doesn't match the "+1% transaction fee" framing in CLAUDE.md (which implies studios normally keep the other 99%).

**Unblock:** Siam decides which model InkBook is actually running on, then this becomes a scoped, buildable task.

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
