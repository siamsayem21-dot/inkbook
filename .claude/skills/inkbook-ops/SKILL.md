---
name: inkbook-ops
description: Claude-first external operations for InkBook across Stripe, Vercel, Supabase, GitHub CI, and browser/E2E verification. Use when asked to configure, verify, test, or continue external service setup without manually clicking through dashboards.
---

# InkBook Claude-First External Operations

Use this skill for operational work that spans InkBook code plus external systems such as Stripe, Vercel, Supabase, GitHub Actions, and authenticated browser flows.

The goal is to minimize Siam's manual dashboard work while preserving strict safety around production, money, identity, security, and irreversible actions.

## Core principle

**API/CLI first. Browser automation second. Human only when truly required.**

Do not ask Siam to manually click through a dashboard if the same action can be performed safely and verifiably through an authenticated API/CLI already available in the environment.

Do not treat a visually successful dashboard screen as sufficient verification. Cross-check important state through at least one independent source such as API response, webhook delivery, database state, logs, or automated E2E output.

## Startup — always do this first

1. Read `CLAUDE.md` in full.
2. Read `TASKS.md` in full for known blockers, approvals, and locked modules.
3. Read `.claude/skills/inkbook-run/SKILL.md` if this operation belongs to a queued build task.
4. Run `git status` and note unrelated uncommitted work. Never touch unrelated modified files.
5. Inspect the relevant code/config before changing any external system.
6. Identify the exact environment: local, test/sandbox, Preview, or Production. Never infer this from a hostname alone.

## Execution order

For each operation, use this order unless a lower step is genuinely required:

1. **Read/inspect via API or CLI** — confirm current state first.
2. **Change via API or CLI** — only when the action is inside the safe-auto boundary below.
3. **Automated browser/E2E** — use only when an API/CLI cannot exercise the required workflow, or when the UI itself is what must be verified. If an authorized browser automation integration is not available, route only that human-only step to Siam.
4. **Independent verification** — confirm the result through a second surface (for example Stripe API + webhook + Supabase row; Vercel deployment + HTTP smoke; browser action + DB state).
5. **Fix and retry** — ordinary errors do not stop the run. Diagnose, make the smallest safe fix, and retry. Retry transient external failures up to 2 times before recording them as an environment issue.

## Safe automatic actions — TEST/NON-PRODUCTION only

Claude may perform these automatically when credentials/tools are already available and the action is reversible/non-destructive:

- Stripe **Sandbox/Test mode** object creation, connected-account testing, test Checkout/payment flows, test webhook triggering/replay, and reading test logs/events.
- Vercel **Preview** deployments, Preview smoke tests, and Preview-only environment-variable changes using test/sandbox values already available to the terminal/runtime.
- Supabase read-only inspection of production state, plus test/QA data creation and cleanup when the cleanup is narrowly scoped, self-verifying, and non-destructive to real user data.
- Read-only inspection of Vercel Production, Stripe live configuration, Supabase production schema/data, and GitHub CI/logs for diagnosis.
- Automated app/browser verification against local or Preview environments.
- Running unit/component/E2E/DB/visual tests and inspecting console/network/runtime logs.

### Secret handling

- Never print, echo, log, commit, screenshot, or paste secret values into chat/output.
- Refer to secrets only by variable name and prefix when necessary (for example `sk_test_…`, never the full value).
- Prefer existing authenticated CLIs, secret stores, or environment variables over asking Siam to copy/paste credentials.
- Never copy a live secret into a test/Preview environment merely to make a test pass.
- If authentication to an external CLI requires a human login/consent step, ask Siam only for that login/consent action, then continue automatically afterward.

## Hard human gates — STOP and use NEEDS_SIAM

Do **not** perform any of the following without explicit Siam approval for that exact action:

- Enabling or changing **live/Production Stripe payment routing**.
- Setting `STRIPE_CONNECT_ENABLED=true` in Production.
- Creating/changing a **live Stripe webhook** or live account capability that changes real payment behavior.
- Using or rotating live secret keys when the action changes production behavior.
- Any real-money payment, refund, payout, transfer, charge, or dispute action.
- Real Stripe KYC/identity/business verification on Siam's or a studio's behalf.
- Production database schema migrations/DDL, RLS policy changes, destructive SQL, or production data deletion.
- Authentication/security-sensitive production configuration.
- Destructive git operations or anything irreversible.
- Major product/UX decisions that require Siam's judgment.

A missing human-only login/KYC step is `NEEDS_SIAM`, not a reason to ask Siam to manually perform the entire workflow.

## Stripe Connect verification pattern

For Stripe Connect work, prefer this exact verification chain:

1. Confirm test/sandbox keys and mode without exposing values.
2. Inspect Connect configuration/capabilities through Stripe API/CLI.
3. Create or reuse a clearly tagged **test** connected account.
4. Complete onboarding with Stripe test data through API/authorized browser only as needed.
5. Confirm `charges_enabled`, `payouts_enabled`, and `details_submitted` through Stripe API.
6. Confirm the expected webhook event is delivered and signature verification succeeds.
7. Confirm the matching InkBook studio row/state is updated correctly in Supabase.
8. Create a Stripe **test** deposit/Checkout flow through InkBook.
9. Complete the payment with Stripe test data.
10. Confirm payment reconciliation through Stripe event + InkBook API/logs + Supabase state.
11. Clean up only QA/test data that is safe and explicitly tagged; never delete real studio/client/payment data.

A green UI alone is not enough to mark this VERIFIED.

## Visual/browser rule

When browser verification is needed, Claude should inspect more than pixels:

- DOM/route state
- console errors
- failed network requests
- visible success/error state
- relevant API response
- resulting DB or external-service state

Use InkBook's existing Visual QA system for InkBook-rendered UI. Do not use visual auto-fix on payment/auth/security/consent/deposit/schema/webhook surfaces where the existing safety rules forbid it.

## Reporting

At the end, report only:

1. What was verified
2. What changed
3. What failed and was fixed
4. Remaining external/environment issue, if any
5. Exact `NEEDS_SIAM` action, if any
6. Exact next safe automated action

Do not dump secrets, raw tokens, full API payloads containing sensitive data, or unnecessary logs.
