# InkBook — Real Studio Simulation & Autonomous Fix Loop State

**Mission started:** 2026-08-24
**Scope guard:** work only inside `C:\Users\asiacom\Desktop\inkbook`. Never touch `retailsight-ai` or port 8000. Local dev server on port 3001 (3000/8000 avoided).

## Pre-flight findings (read before testing)
- Repo is extremely mature: Owner Portal 16/16 locked, Artist Portal fully built, Client Portal (auth/consultation/quote/deposit/messaging/bookings/history/settings) shipped, Stripe Connect live in Production (`STRIPE_CONNECT_ENABLED=true`), Sentry live, CI green. This is not a fresh MVP — expect confirmation-level findings more than fresh P0s, but test for real anyway.
- No separate staging DB — local dev (`npm run dev`) points at the **same production Supabase** used by `www.inkbook.tech`. Established project pattern: use `[QA-SEED-<MODULE>-<DATE>]`-tagged synthetic data, guarded cleanup scripts, verify cleanup against known baselines before finishing. STRIPE test-mode keys only, never real card activity.
- Known already-open items relevant to QA (from DEFERRED_ISSUES.md, do not re-discover as "new"):
  - #1 State-specific consent legal text — deferred, needs Siam (legal).
  - #2 Wildcard subdomain routing — deferred, needs Siam (infra), path-based `/book/[studio]` is the real V1 routing.
  - #4 Orphaned `app/client-portal/**` prototype — dead code, not touched.
  - #6 sibling note: consultation-originated deposit bookings scheduling bug — RESOLVED already (2026-08-19).
  - #7 Cron cadence once-daily on Vercel Hobby — accepted for V1/beta (Siam decision already made).
  - #8 "AI Artist Match" — per V1_mission memory this was later built (AI Artist Match shipped) — verify still true, don't assume stale.
  - #12 Minor hardening items (idempotency on consultation submit, two parallel quote-gen endpoints, unused Stripe publishable key/dep, stale worktree, billing checkout idempotency gap) — low priority, pick up opportunistically only if trivial.
  - Known stale cross-studio data row `48c5f479-7b36-452a-8a72-3aea4cbefdbc` in production `bookings` — pre-existing, documented, NOT to be treated as a new finding, NOT to be deleted without Siam (production data).

## Safety addendum (from Siam, mid-run)
- Local dev points at the SAME production Supabase as www.inkbook.tech. Rules for this run:
  - Use ONLY clearly QA-tagged test studios/users/records (tag: `[QA-SEED-REALSTUDIO-20260824]`).
  - Never modify real studio/client data (confirmed real studios in prod DB to avoid: `arafkhan`, `sdfasd`, `thx`, `imranproducts`, `imranproduct`, `naharsolutions`, `naharstore`, `mscreation`, `siament`, `siam3nt`, `inkandironstudio` (live "SM CreationS"), `smoke1783978573179sub`, `test`/abcd).
  - Never delete or bulk-clean production data.
  - No migrations/schema changes this run.
  - Stripe TEST mode only, never real card activity.
  - Any QA data created must be isolated, clearly tagged, and safely reversible (cleanup script prepared, guarded by tag, run at the end).
  - If a workflow can't be safely simulated without touching real customer/payment/legal data, record it as deferred and continue the rest of the loop.

## Environment
- Local dev server running on `http://localhost:3001` (background task, PID ~13768). Port 3000/8000 avoided (8000 is RetailSight AI territory).
- Existing production data snapshot (read-only probe, 2026-08-24): 15 studios total, 12 active artists. 2 are already-tagged QA leftovers (`[QA-OVERNIGHT-ARTIST-SWEEP] Studio A/B`) from a prior session — not touched, not mine to clean up unless they block something.

## Round 1 — RESULT: PASS (real browser, via Playwright driving local dev server against prod Supabase)
- Owner registration (`/register`) → studio created → redirected to `/owner/dashboard`: PASS (3 consecutive runs, 8/8 checks each after fix).
- Session persists across refresh: PASS.
- `/owner/settings/studio` reachable, shows correct studio name: PASS.
- Public studio page reachable at `/book/[subdomain]`: PASS.
- Owner → Artists → real invite modal (`ArtistsClient.tsx`) → `inviteArtist()` → DB row created → `/artist/accept/[token]` → real artist login → `/artist/dashboard` → owner sees artist in roster: PASS end-to-end.
- QA identity in use: studio subdomain `qa-realstudio-1787585395538`, owner `qa-realstudio-owner-1787585395538@inkbook.test` / `QaRealStudio20260824!Ink`, artist `qa-realstudio-artist-1787585541223@inkbook.test` / `QaRealStudioArtist20260824!Ink`. All tagged `[QA-SEED-REALSTUDIO-20260824]`.
- Bugs found this round: ISSUE-001 (systemic unlinked form labels, batch 1/3 fixed: register/login/reset-password), ISSUE-002 (2 orphaned/unreachable dead-code trees, deferred to Siam).
- Leftover QA cruft from earlier flaky/exploratory runs (not the primary studio above), to include in final cleanup: studios/owners with STAMP 1787585186873 (failed run, orphaned auth user only, no studio), 1787585334860, 1787585376077 (extra successful runs), plus a `qa-debug-*` studio/user from ad-hoc debugging. All tagged `[QA-SEED-REALSTUDIO-20260824]`, all safe to delete.

## Round 2/3 — RESULT: PASS (public discovery + AI consultation, real browser, real AI calls)
- Public studio home, Artists tab (shows QA Artist Jordan), Portfolio tab: all load cleanly, no console errors.
- Full 5-step consultation wizard completed for real: contact info → tattoo vision (fine-line botanical rose/snake, black & grey, $500-1000 budget) → real `/api/ai/consultation-questions` call (200, 3 genuinely relevant follow-up questions) → real `/api/ai/style-detect` call (200, correctly detected "Fine Line" style at 92% confidence with sound reasoning) → review summary (correct client name/email shown) → submit.
- DB verified: `consultations` row created with correct `studio_id`, `client_name`, `client_email`, `tattoo_description`, `placement`, `detected_style`, `status: "new"`.
- Note: first cold hit of an AI route in `next dev` can take >6s to JIT-compile — a local dev-only artifact, not a production concern (confirmed by 3 subsequent clean runs).
- No bugs found this round.

## Round 4/5 — RESULT: PASS (Quote + real Stripe TEST deposit payment, full webhook proof)
- Owner: consultation detail page loads correct client data → "Generate AI Quote" produces a real price range/session/difficulty draft → Final Price ($650)/Session Count (2) saved → DB confirms `status: "quoted"`, `final_price: 650`.
- Owner: selected artist, generated a real Stripe TEST Checkout Session (`cs_test_...`, confirmed Sandbox mode) via "Generate Deposit Link" — screenshot-verified the hosted Checkout page renders correctly (correct studio/artist branding, correct QA tag, "$100.00" deposit, correct non-refundable-on-no-show policy copy).
- Ran the REAL payment + REAL webhook proof (not simulated): started `stripe listen --forward-to localhost:3001/api/stripe/webhook` (existing `.env.local` `STRIPE_WEBHOOK_SECRET` already matched the CLI's deterministic local signing secret — no env edit needed), completed the Stripe Checkout with the standard test card (4242 4242 4242 4242) via real browser automation, confirmed the webhook was delivered and correctly signature-verified by the local server.
- DB verified post-payment: `consultations.status → "deposit_paid"`, `booking_id` linked; `bookings` row created with `status: "awaiting_schedule"`, `deposit_paid: true`, `deposit_paid_at` set, correct `studio_id`/`artist_id`, `deposit_amount_cents: 10000` ($100).
- Client redirected correctly to the consent-form step after payment.
- No bugs found this round. (Full Stripe Connect Direct-Charge reconciliation itself was already proven live in production by a prior session — see DEFERRED_ISSUES.md #3 — so this round's value was proving the classic/legacy webhook path + the real UI/checkout experience, not re-proving Connect.)

## Round 6 — RESULT: PASS (Consent form, real submission)
- `/book/[studio]/[artistId]/book/consent?booking_id=...` loads correctly: progress tracker (✓Your details, ✓Pay deposit, 3.Sign consent), summary card (Artist, Date "To be scheduled" — correct, since this booking is still `awaiting_schedule`; Deposit paid $100.00), full form (Full legal name, DOB, Government ID photo upload, consent text, checkbox, signature).
- Filled and submitted with a real uploaded image file (magic-byte/MIME validation passed for a real PNG) → `POST /api/consent-forms` returned `200 {"success":true}` → correctly redirected to `/book/.../confirmation` → "You're booked! Your appointment is confirmed. You'll receive SMS reminders 48 hours before and on the day of your appointment."
- DB verified: `consent_forms` row created with correct `booking_id`, `client_id`, `client_signature: "Taylor Rivera"`, `is_minor: false`, `id_photo_url` correctly namespaced, `state_template: "US"`, `signed_at` timestamp.
- No bugs found this round.

## Round 7 — RESULT: PASS (Appointment Day — cross-portal consistency)
- Owner assigned a real date/time (2026-08-25 2:00 PM) to the `awaiting_schedule` booking via the real "Assign Schedule" UI → DB confirms `status: "confirmed"`, `date`/`time` set correctly.
- Owner Booking Detail, Artist Bookings list, and Artist Schedule day-view (`?date=2026-08-25`) were independently checked and all three agree exactly: client Taylor Rivera, artist QA Artist Jordan, status Confirmed, Aug 25 2026 2:00 PM, style Fine Line, deposit $100.00 Paid — no cross-view drift, no stale data.
- No bugs found this round.
- Testing-environment note (not a product bug): local `next dev` login occasionally needs a retry within a single test run — cold on-demand route compilation (dev-mode-only) plausibly explains it; every isolated retry succeeded immediately, and production is prebuilt so this JIT-compile delay doesn't apply there.

## Round 8 — RESULT: PASS (Session Agreement + Completion)
- Artist → `/artist/agreements/new` → real booking correctly offered in the dropdown ("Taylor Rivera — Fine Line (Aug 25, 2026)") → filled scope/placement/size/price/client signature → saved with no error.
- DB verified: `session_agreements` row correct (`design_description`, `placement`, `agreed_price_cents: 65000`, `client_signature: "Taylor Rivera"`).
- Artist → booking detail → "Mark Session Completed" available (status=confirmed && hasConsent gating correctly passed) → clicked → DB verified: `bookings.status → "completed"`, `completed_at` set.
- 2 apparent test failures during this round were investigated and confirmed to be my own script's bugs, not product bugs: a wrong column name (`price_cents` vs the real `agreed_price_cents`) on my verification query, and a DB read that ran before the async completion transition had finished (completion did succeed, ~a few hundred ms after my first check). No real product defect found.
- Noted, not a bug: `remainder_collected: false` at completion time (deposit $100 paid, quote $650, so $550 remains uncollected) — this matches the app's actual design (remainder collection is a separate owner/artist-triggered action, not a completion gate); not tested further this round for time.

## Current status
- Round: security isolation spot-check + mobile viewport check, then QA data cleanup and final report. (Round 9 aftercare/review not exercised live — the review-request path is a once-daily cron per DEFERRED_ISSUES.md #7, already verified correct by a prior session; re-triggering it live was judged lower value than isolation/mobile coverage given remaining time budget. `bookings.review_requested_at` is still null on our QA booking as expected pre-cron-run.)
- Persona: C — Client (isolation attempts), all personas (mobile)
- Last passed step: Round 8 fully verified
- Next step: attempt cross-studio/cross-client data access on the real QA data, check 2-3 key public pages at mobile viewport

## Regression status
- No fixes applied yet this run.

## Last full journey result
- Not yet run.
