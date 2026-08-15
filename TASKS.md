# InkBook Build Queue

## CURRENT

_(empty — Artist Dashboard lock workflow in progress, see DONE once complete. Next task pulled from NEXT when one is queued.)_

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

- **Artist Portal — Artist Dashboard module (redesign + earnings bug fix) — LOCKED (1st of Artist Portal series)**
  - First module of the new Artist Portal redesign series (Owner Portal is 16/16 locked and untouched). Branch: `feature/artist-dashboard-redesign`, merged to `master`.
  - Scope: `app/(artist)/artist/dashboard/page.tsx`, `app/(artist)/artist/dashboard/loading.tsx`, `components/artist/CopyLinkButton.tsx` — visual layer redesigned to the light/violet system, all other data queries/logic preserved. Shared `components/shared/Sidebar.tsx` deliberately untouched (shared with the locked Owner Portal). New read-only tool: `scripts/verify-artist-dashboard-data.mjs`.
  - **Bug fixed (Siam-approved):** "This Month's Earnings" now sums `status IN ('confirmed','completed')` (was `'confirmed'` only), matching `earnings/page.tsx`'s existing `PAID_STATUSES` logic exactly — the two pages can no longer disagree on the same metric. Verified against temporary QA data (self-created, self-cleaned): corrected total $980 vs buggy $750, confirmed by direct DB query before sign-off. QA account, artist row, and all 7 QA bookings deleted and re-verified clean (9 artists / 30 bookings, back to exact pre-QA baseline) before this lock.
  - **Root-cause diagnosis performed (no fix, not in scope):** Siam's own owner login (`siam.sayem21@gmail.com`) has no linked artist profile — traced to `removeArtist()` (`app/(owner)/owner/artists/actions.ts`) nulling `user_id` on a prior removal at a *different* studio ("Araf Khan", owned by a separate account) while leaving `is_active: true`. Expected, correct behavior, not a bug.
  - **Other pre-existing bugs found and reported, still NOT fixed (out of scope for this module, Siam's call):**
    1. Stale cross-studio data row `48c5f479-7b36-452a-8a72-3aea4cbefdbc` — see the correction note in the Owner Bookings Balance Bug memory. Production data, untouched.
    2. `artists.is_active` not checked by the Dashboard's artist lookup — minor, not currently exploitable (no "deactivate artist" UI action exists anywhere in the app yet).
  - Full lock sequence run and verified (2026-08-15): QA cleanup verified clean · typecheck clean · unit tests 483/483 · component tests 12/12 · production build clean (`/artist/dashboard` compiled with no errors). `test:db`/`test:e2e` not runnable locally (no Docker) — covered by GitHub Actions CI post-push, same known-pre-existing Stripe-secrets E2E gap tracked in `## BLOCKED` applies here too, unrelated to this module.
  - Files: `app/(artist)/artist/dashboard/page.tsx`, `app/(artist)/artist/dashboard/loading.tsx`, `components/artist/CopyLinkButton.tsx`, `scripts/verify-artist-dashboard-data.mjs`

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
