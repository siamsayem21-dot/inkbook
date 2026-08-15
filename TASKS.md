# InkBook Build Queue

## CURRENT

_(empty — all 3 safe continuous-workflow test tasks complete. Next task pulled from NEXT when one is queued.)_

## NEXT

_(empty — Siam's existing ChatGPT InkBook Project will supply the next tasks)_

## BLOCKED

- **CI: E2E "full owner workflow" test fails at the deposit-collection step (pre-existing, unrelated to any Owner Portal redesign)**
  - `tests/e2e/owner-workflow.spec.ts` fails in the GitHub Actions `db-and-e2e` job because `STRIPE_TEST_SECRET_KEY` / `STRIPE_TEST_PUBLISHABLE_KEY` are not configured as GitHub repo secrets, so the deposit-payment step has nothing to pay against.
  - Confirmed identical failure signature on 3 consecutive master pushes: Flash module redesign, Messages module redesign, and Settings module redesign — none of which touch Stripe or deposit code, confirming this is an environment/secrets gap, not a regression from any of those changes.
  - Unit (483), component (12), and DB verification (80, against a real CI Postgres) all pass cleanly in the same CI runs; only this one Stripe-dependent E2E test is affected.
  - Needs Siam to add the two Stripe test-mode secrets to the GitHub repo before this job can go green.

## NEEDS_SIAM

_(none)_

## DONE

- **Owner Settings module redesign (light/violet system) — LOCKED (16/16 Owner Portal modules complete)**
  - 16th and final Owner Portal module in the "redesign every Owner module to InkBook light/violet system" series (Artists, Bookings, Requests, Clients, Revenue, Reviews, Blacklist, Consent Forms, Waitlist, Knowledge, Messages, Flash were already done and committed).
  - Multi-studio Billing bug found and fixed: `billing/page.tsx` previously resolved the studio via `supabase.auth.getUser()` + `.eq("owner_id", user.id)`; now uses `getStudioId()` + `.eq("id", studioId)`, matching the resolution pattern used across every other Owner module.
  - Full lock sequence run and verified (2026-08-15): typecheck clean · unit tests 483/483 · component tests 12/12 · DB verification tests 80/80 (CI, real Postgres) · production build clean · committed (`c5acf66`) · pushed to `origin/master` · Vercel production deploy Ready and aliased to `www.inkbook.tech` · production smoke test confirmed all 3 routes (`/owner/settings`, `/owner/settings/studio`, `/owner/settings/billing`) live and correctly gated behind `/login`.
  - One CI job (E2E full-owner-workflow) failed during this run for a confirmed pre-existing, unrelated reason — tracked separately in `## BLOCKED`. Siam reviewed and approved locking Settings despite it.
  - Files: `app/(owner)/owner/settings/page.tsx`, `app/(owner)/owner/settings/billing/page.tsx`, `app/(owner)/owner/settings/billing/BillingClient.tsx`, `app/(owner)/owner/settings/studio/page.tsx`, `app/(owner)/owner/settings/studio/StudioSettingsClient.tsx`

- **[Safe continuous-workflow test 1/3] Run TypeScript typecheck and verify the result — VERIFIED**
  - Ran `npx tsc --noEmit -p tsconfig.json` (2026-08-15). Exit clean, zero output, zero errors. Genuine pass.

- **[Safe continuous-workflow test 2/3] Run the normal unit test suite and verify the result — VERIFIED**
  - Ran `npm run test` (2026-08-15). Vitest: 42 test files, 483/483 tests passed. Genuine pass.

- **[Safe continuous-workflow test 3/3] Run lint and verify the result — VERIFIED**
  - Ran `npm run lint` (2026-08-15). `next lint`: no warnings, no errors. Genuine pass.
