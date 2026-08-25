# InkBook — Product Coverage Matrix

Route/surface-level inventory. Discovered from `app/**` (page routes),
`app/api/**` (API routes), and `**/actions.ts` (server actions) via
filesystem enumeration, cross-checked against `grep` for live references
before marking anything NOT_APPLICABLE. Status legend: PASS, FAIL, FIXED→
RETESTED→PASS, BLOCKED_EXTERNAL, BLOCKED_NEEDS_SIAM, NOT_APPLICABLE (reason
required), NOT_TESTED.

## AUTH (3 pages + 1 invite-accept flow)
| Route | Status | Evidence |
|---|---|---|
| `/login` | PASS | `scripts/qa-phase-a-auth.mjs` A1: invalid credentials → error shown, stays on page. Password toggle already verified this session (design-pass QA). |
| `/register` | PASS | A2: short-password client-side validation correctly blocks submit with message, stays on page. |
| `/reset-password` | PASS | A3: no-session visit correctly redirects to `/login?error=link_expired`. |
| `/artist/accept/[token]` | NOT_TESTED | Invite-flow, needs a real invite token — scheduled for Owner Phase B (artist invite creation) |
| `/dashboard` (redirect hub) | PASS | A4 confirms logged-out→`/login`. Owner/Artist branch redirects already proven correct in the design-pass session (code read, `/dashboard/page.tsx` role-branches to `/owner/dashboard`/`/artist/dashboard`/`/register`). |

**Role-boundary security (Phase A5/A6):** Owner (studio, no artist row) visiting
any `/artist/**` route → server-redirected to `/artist/dashboard` (verified via
source: every artist sub-page does its own `.eq("user_id", user.id)` artist
lookup + `redirect("/artist/dashboard")` if none — not just a layout-level
check). Artist (artist row, no studio) visiting any `/owner/**` route →
redirected to `/register`. Both confirmed via real login + real navigation,
not code inspection alone. **0 findings.**

## OWNER PORTAL (20 top-level + 3 detail routes)
| Route | Status | Evidence |
|---|---|---|
| `/owner/dashboard` | NOT_TESTED | |
| `/owner/consultations` | NOT_TESTED | (Pipeline board, which surfaces the same data, is PASS — the dedicated list/filter-strip view itself not yet independently clicked) |
| `/owner/consultations/[id]` | PASS | `scripts/qa-full-studio-journey.mjs` — real AI quote generation, AI Artist Match "Recommended" optgroup, deposit-collection artist picker, status transitions all real-interacted end-to-end |
| `/owner/pipeline` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B12 — Kanban stage counts cross-checked vs. DB, dual-source (consultation + custom_request) cards both confirmed rendering |
| `/owner/artists` | PASS | `scripts/qa-phase-b-owner.mjs` — invite/resend/cancel/remove all DB-verified, empty+populated+mobile states |
| `/owner/artists/new` | FIXED→RETESTED (locally; prod redeploy pending Siam approval) | Was a dead unwired static form — see EXHAUSTIVE_ISSUES.md |
| `/owner/artists/[artistId]` | NOT_TESTED | |
| `/owner/bookings` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B10 — filter-strip status counts cross-checked vs. DB across all 6 statuses, empty/populated states, detail nav |
| `/owner/bookings/[bookingId]` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B11 — real detail render for a completed booking (correct status/deposit/consent state shown) |
| `/owner/requests` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B13/B14 — Approve modal → real `quote_amount`/`deposit_amount`/status DB-verified; Decline modal → real status/reason DB-verified |
| `/owner/requests/[id]` | NOT_TESTED | (the standalone detail page's own `OwnerQuoteForm.tsx` — approve/decline was exercised via the list page's modals instead, which cover the same server actions) |
| `/owner/messages` | PASS | Cross-role verified via `scripts/qa-phase-d-client.mjs` — a client-sent message was confirmed visible to the owner here in real time |
| `/owner/messages/[threadId]` | NOT_TESTED | |
| `/owner/flash` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B23 — owner's read-only cross-artist view correctly shows an artist-created flash design |
| `/owner/clients` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B15 — booking-count/consent/blacklist enrichment confirmed against seeded DB state |
| `/owner/revenue` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B16 — dollar figures cross-checked against a raw DB query, including "Deposits kept (no-shows)" for a seeded no-show booking |
| `/owner/reviews` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B17 — add → real DB row, Hide toggle → `is_public` flips, 2-click delete → row removed |
| `/owner/blacklist` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B18 — block → DB row + `audit_log` entry; **a real `POST /api/bookings` with the blocked email is rejected HTTP 400**, proving enforcement at the API, not just the UI; remove → row deleted |
| `/owner/consent-forms` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B19 — correct empty state for a studio with zero signed forms; populated-state rendering already confirmed via Phase C/D consent-form flows joining into this same table |
| `/owner/waitlist` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B20 — monthly cap edit → DB-verified, remove entry → DB-verified |
| `/owner/knowledge` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B21 — create → DB row, Disable toggle → `is_active` flips, edit → persists, 2-click delete → row removed |
| `/owner/audit-log` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B22 — real block/unblock events appear, `?action=` filter correctly scopes the results table |
| `/owner/settings` | NOT_TESTED | (redirect/index page — `/owner/settings/studio` and `/owner/settings/billing`, the two real destinations, are both PASS) |
| `/owner/settings/billing` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B24 — correct plan label/price for `plan='studio'`; Stripe Connect section renders (STRIPE_CONNECT_ENABLED=true confirmed active) |
| `/owner/settings/studio` | PASS | name/address edit → DB-verified persistence |

## ARTIST PORTAL (11 top-level + 6 detail/sub routes)
| Route | Status | Evidence |
|---|---|---|
| `/artist/dashboard` | PASS | `scripts/qa-phase-c-artist.mjs` — real login, route sweep desktop+mobile |
| `/artist/consultations` | PASS | claim workflow + isolation DB-verified |
| `/artist/consultations/[id]` | PASS | colleague/cross-studio direct-nav both 404 |
| `/artist/schedule` | PASS | Days Off add/remove DB-verified, real booking-rejection proof (409→201) |
| `/artist/bookings` | PASS | route sweep + isolation |
| `/artist/bookings/[bookingId]` | PASS | consent gate, Mark Completed, colleague/cross-studio blocked |
| `/artist/requests` | PASS | custom-request approve/decline DB-verified |
| `/artist/requests/[id]` | PASS | |
| `/artist/messages` | PASS | send + thread isolation DB-verified |
| `/artist/messages/[threadId]` | PASS | colleague direct-nav → 404 |
| `/artist/portfolio` | PASS | real upload/style-tag/delete, all DB-verified |
| `/artist/flash` | PASS | create/delete DB-verified + confirmed live on public studio page |
| `/artist/earnings` | PASS | dollar-figure cross-checked against raw DB query, status filter confirmed correct |
| `/artist/clients` | PASS | isolation confirmed (own client shown, colleague-only hidden) |
| `/artist/clients/[clientId]` | PASS | colleague-only client → 404 |
| `/artist/agreements` | PASS | create DB-verified, appears in list |
| `/artist/agreements/[id]` | PASS | |
| `/artist/agreements/new` | PASS | |

**Artist Portal cross-studio isolation (Artist C, different studio):** 0 data
leakage across 5 routes + 3 direct-ID probes. **Full Phase C: 0 findings**
(68 real interactions, desktop+mobile).

## CLIENT PORTAL — LIVE (`app/portal/[studio]/**`, 7 top-level + 4 sub)
| Route | Status | Evidence |
|---|---|---|
| `/portal/[studio]/dashboard` | PASS | `scripts/qa-phase-d-client.mjs` D2 — welcome, magnetic CTA, section cards, mobile, all real |
| `/portal/[studio]/consultation` | PASS | D1 — real Claude AI round-trip, message 1→2 |
| `/portal/[studio]/projects` | PASS | D3 — 6 real projects across full lifecycle, desktop+mobile |
| `/portal/[studio]/projects/[id]` | PASS | D3/C1-C6 — new/quoted/accepted/deposit-pending/confirmed/completed states all real |
| `/portal/[studio]/projects/[id]/consent` | PASS | consent submission DB-verified after fixing QA seed gap (see EXHAUSTIVE_ISSUES.md) |
| `/portal/[studio]/bookings` | PASS | D4 — 4 real bookings, desktop+mobile |
| `/portal/[studio]/bookings/[bookingId]` | PASS | D4 — deposit countdown, message-about-booking, aftercare, review all DB-verified |
| `/portal/[studio]/bookings/[bookingId]/review` | PASS | real review submission DB-confirmed (rating, is_public default, ownership), idempotent redirect on revisit |
| `/portal/[studio]/history` | PASS | D5 — timeline + general conversations render, mobile clean |
| `/portal/[studio]/messages` | PASS | D6 — real send, thread list, idempotent "New Conversation" |
| `/portal/[studio]/messages/[threadId]` | PASS | D6 — full cross-role round trip confirmed (client↔owner) |
| `/portal/[studio]/settings` | PASS | D7 — real display-name save, DB-confirmed, persists across reload |

**Client Portal security (Phase D8/D8b):** Client B (empty account) sees
correct empty states on 3 routes; 5/5 direct-ID IDOR probes against Client
A's data (project/consent/booking/review/thread) all correctly blocked
(404). Cross-studio: Client A's session can view Studio B's portal *shell*
(by design — client accounts aren't studio-invitation-gated, confirmed via
`lib/client-portal/*.ts`'s double `studio_id`+`client_account_id` scoping on
every real query) but zero actual Studio A data leaks into it. **0 real
security findings.**

**Full Phase D: 3 real findings, all explained** — see EXHAUSTIVE_ISSUES.md
(the P0 Stripe Connect finding surfaced 3 times here via different clicks;
1 QA-seed gap surfaced 3 times via the consent flow; 3 lower-confidence
items not blocking).

## CLIENT PORTAL — ORPHANED PROTOTYPE (`app/client-portal/[studio]/**`)
| Route | Status | Evidence |
|---|---|---|
| `/client-portal/[studio]` | NOT_APPLICABLE | Orphaned prototype — fresh `grep -rl` this session (2026-08-25) found zero live references to this route tree from any reachable app code; only coincidental matches were the unrelated `lib/client-portal/*` utility module used by the real `app/portal/[studio]/**` routes. Matches prior audit finding (memory: "Orphaned app/client-portal/** prototype... zero live references"). Not part of exhaustive scope — testing a route nothing links to would not verify anything real. |
| `/client-portal/[studio]/home` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/my-profile` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/my-tattoos` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/my-tattoos/[id]` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/studio` | NOT_APPLICABLE | Same reason |

## LEGACY REDIRECT HUB (`app/dashboard/**`)
| Route | Status | Evidence |
|---|---|---|
| `/dashboard` | NOT_TESTED | Real route — always redirects (owner→`/owner/dashboard`, artist→`/artist/dashboard`, else→`/register`); the redirect LOGIC itself is testable/real even though the page body never renders. Will verify redirect correctness for all 3 branches. |
| `/dashboard/artists` | NOT_APPLICABLE | Unreachable — `/dashboard/page.tsx` always redirects before any child route can render; confirmed zero live `<Link>`/`router.push` references to this path via fresh grep this session. |
| `/dashboard/bookings` | NOT_APPLICABLE | Same reason |
| `/dashboard/consent-forms` | NOT_APPLICABLE | Same reason |

## PUBLIC / WHITE-LABEL BOOKING (real dynamic `/book/[studio]/**`)
| Route | Status | Evidence |
|---|---|---|
| `/book/[studio]` | PASS | `scripts/qa-phase-e-public.mjs` E1/E2 — full landing render from real DB content (branding, 2 artist cards, portfolio, flash, reviews, FAQ); invalid slug correctly 404s |
| `/book/[studio]/[artistId]` | PASS | `scripts/qa-phase-e-public.mjs` E3 — profile render + "Book now" CTA nav |
| `/book/[studio]/[artistId]/book` | PASS | `scripts/qa-phase-e-public.mjs` E4 — BookingForm real submission → real booking row |
| `/book/[studio]/[artistId]/book/consent` | PASS | `scripts/qa-phase-e-public.mjs` E4 — real `ConsentForm` submission → `consent_forms` row DB-verified |
| `/book/[studio]/[artistId]/book/deposit` | PASS | `scripts/qa-phase-e-public.mjs` E4 — real redirect to Stripe Checkout, real TEST payment completed via `stripe trigger`, booking reaches `status='confirmed'` |
| `/book/[studio]/[artistId]/book/confirmation` | PASS | `scripts/qa-phase-e-public.mjs` E4 — confirmation page reached after real consent submission |
| `/book/[studio]/consult` | NOT_TESTED | The public landing page's "Start AI Consultation" CTAs link to `/book/[studio]/login`, not this route directly — not yet independently confirmed reachable/used |
| `/book/[studio]/consent` | PASS | `scripts/qa-phase-e-public.mjs` E8 — standalone consent entry page renders with correct studio name/heading |
| `/book/[studio]/custom` | PASS | `scripts/qa-phase-e-public.mjs` E5 — real 3-step form submission → `custom_requests` row DB-verified |
| `/book/[studio]/flash/[flashId]/book` | PASS | `scripts/qa-phase-e-public.mjs` E6 — real booking with derived style/description, `is_booked` flag set, correct 404 on re-visit for a one-time design |
| `/book/[studio]/request/[id]` | PASS | `scripts/qa-phase-e-public.mjs` E9 — real quote_amount/deposit_amount/quote_message rendering + conditional "Pay deposit" CTA |
| `/book/[studio]/login` | PASS | `scripts/qa-phase-e-public.mjs` E7 — real `signInWithOtp()` call confirmed (redirect verified when Supabase's own project-wide email quota wasn't already exhausted by this session's testing; see EXHAUSTIVE_ISSUES.md) |
| `/book/[studio]/login/verify` | PASS | `scripts/qa-phase-e-public.mjs` E7 — page renders correct email + 6-digit code UI; real code entry not independently retestable (no test-inbox access), underlying mechanism covered by Phase A/D |

## PUBLIC / MARKETING (out of design scope, still functionally testable)
| Route | Status | Evidence |
|---|---|---|
| `/` (landing) | NOT_TESTED | |
| `/pricing` | NOT_TESTED | |
| `/privacy` | NOT_TESTED | |
| `/terms` | NOT_TESTED | |
| `/book/demo-studio` | NOT_TESTED | Static demo page, distinct from the real `/book/[studio]` dynamic route |
| `/book/demo-studio/consult` | NOT_TESTED | |

## API ROUTES (31)
| Route | Status | Evidence |
|---|---|---|
| `POST /api/ai/artist-match` | PASS | real Claude call, correct style-based ranking, verified via `qa-full-studio-journey.mjs` |
| `POST /api/ai/consultation-questions` | NOT_TESTED | exercised indirectly via Client Portal AI chat (Phase D1) but not isolated |
| `POST /api/ai/quote-generate` | PASS | real Claude call, realistic price range + reasoning, verified via `qa-full-studio-journey.mjs` |
| `POST /api/ai/style-detect` | NOT_TESTED | exercised indirectly via Client Portal AI chat (Phase D1) but not isolated |
| `/api/artists` | NOT_TESTED | |
| `/api/auth/[...nextauth]` | NOT_TESTED | Verify this is actually live/used — project's real auth is Supabase Auth, not NextAuth; may be dead |
| `/api/billing/create-checkout` | NOT_TESTED | |
| `/api/billing/portal` | NOT_TESTED | |
| `POST /api/billing/webhook` | NOT_TESTED | |
| `POST /api/bookings` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B18 — direct POST with a blacklisted client email correctly rejected HTTP 400; positive booking-creation path already covered indirectly via Phase C's real 409-conflict test on artist days-off |
| `/api/consent-forms` | PASS | Investigated during Phase D — real 402 "No deposit found" validation confirmed correct (rejects a booking without a matching `deposit_payments` row); real signed submission with proper deposit data confirmed working, `consent_forms` row created |
| `/api/consent-forms/standalone` | NOT_TESTED | |
| `GET /api/cron/cancel-expired` | NOT_TESTED | |
| `GET /api/cron/no-show` | NOT_TESTED | |
| `GET /api/cron/payment-reminders` | NOT_TESTED | |
| `GET /api/cron/review-requests` | NOT_TESTED | |
| `GET /api/cron/sms-reminders` | NOT_TESTED | |
| `GET /api/cron/waitlist-notify` | NOT_TESTED | |
| `/api/custom-requests` | NOT_TESTED | (client-facing submission endpoint — the owner-side review of a submitted request is PASS via B13/B14) |
| `POST /api/custom-requests/[id]/decline` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B14 — real fetch via the Decline modal, `status`/`declined_reason` DB-verified |
| `POST /api/custom-requests/[id]/deposit` | NOT_TESTED | (client-side deposit-payment step for a quoted custom request — same Connect fail-closed exposure as the P0 finding, not yet independently confirmed for this specific endpoint) |
| `POST /api/custom-requests/[id]/quote` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B13 — real fetch via the Approve modal, `status`/`quote_amount`/`deposit_amount` DB-verified |
| `POST /api/custom-requests/[id]/schedule` | NOT_TESTED | |
| `POST /api/owner/clients/import` | NOT_TESTED | |
| `/api/reminders` | NOT_TESTED | |
| `POST /api/send-sms` | NOT_TESTED | |
| `POST /api/stripe/checkout` | PASS | `scripts/qa-phase-e-public.mjs` E4 — real session creation + a real completed Stripe TEST payment via `stripe trigger`, confirming this "classic" flow's own `deposits`-table path (webhook Branch C) end-to-end, unaffected by the Connect fail-closed P0 finding since it never routes through Connect |
| `POST /api/stripe/connect/login-link` | NOT_TESTED | |
| `POST /api/stripe/connect/onboard` | NOT_TESTED | |
| `POST /api/stripe/connect-webhook` | PASS | 13/13 checks via `scripts/verify-connect-live.mjs` re-run this mission — real TEST payment, idempotency, cross-studio-mismatch rejection, 0% application fee |
| `POST /api/stripe/webhook` | PASS | real TEST payment reconciliation verified via `qa-full-studio-journey.mjs` (deposit_payments + bookings + consultations all correctly updated) — **also the route where the P1 finding's charge actually landed, confirming it's live/reachable for this exact scenario** |
| `/api/studios` | NOT_TESTED | |
| `POST /api/twilio/sms` | NOT_TESTED | Do not send real SMS to real numbers |
| `/api/waitlist` | NOT_TESTED | |

## SERVER ACTION FILES (26) — exercised via their owning route's UI, not directly
| File | Status |
|---|---|
| `app/(artist)/artist/agreements/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/bookings/[bookingId]/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/consultations/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/flash/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/messages/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/portfolio/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/schedule/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/artists/actions.ts` | PASS | `scripts/qa-phase-b-owner.mjs` — invite/resend/cancel/remove all DB-verified |
| `app/(owner)/owner/audit-log/actions.ts` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B22 — `getAuditLogEntries` filter param DB-verified |
| `app/(owner)/owner/blacklist/actions.ts` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B18 — add/remove DB+audit_log-verified, plus a real negative booking-API test |
| `app/(owner)/owner/bookings/[bookingId]/actions.ts` | PASS (sendDepositRequest — see P1 finding) | `scripts/qa-full-studio-journey.mjs` — real invocation surfaced the P1 wrong-Stripe-account bug (EXHAUSTIVE_ISSUES.md); other actions in this file (assignSchedule, markCompleted) not yet independently exercised from the Owner side |
| `app/(owner)/owner/flash/actions.ts` | NOT_TESTED | (owner's Flash page is a read-only cross-artist view by design — see page.tsx comment; if this file exposes any owner-side mutation it hasn't been clicked yet) |
| `app/(owner)/owner/knowledge/actions.ts` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B21 — create/toggle/edit/delete all DB-verified |
| `app/(owner)/owner/messages/actions.ts` | PASS | Cross-role verified via `scripts/qa-phase-d-client.mjs` (owner receive+reply confirmed real-time) |
| `app/(owner)/owner/reviews/actions.ts` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B17 — add/toggle/delete all DB-verified |
| `app/(owner)/owner/settings/studio/actions.ts` | PASS | `scripts/qa-phase-b-owner.mjs` B8 — name/address edit DB-verified |
| `app/(owner)/owner/waitlist/actions.ts` | PASS | `scripts/qa-phase-b-owner-part2.mjs` B20 — cap edit + remove both DB-verified |
| `app/artist/accept/[token]/actions.ts` | NOT_TESTED |
| `app/book/[studio]/consult/actions.ts` | NOT_TESTED | (route reachability itself unconfirmed — see route table) |
| `app/book/[studio]/custom/actions.ts` | PASS | `scripts/qa-phase-e-public.mjs` E5 — `submitCustomRequest` real DB-verified |
| `app/book/[studio]/flash/[flashId]/book/actions.ts` | PASS | `scripts/qa-phase-e-public.mjs` E6 — `markFlashAsBooked` real DB-verified (`is_booked` flips true) |
| `app/client-portal/[studio]/my-profile/actions.ts` | NOT_APPLICABLE | Belongs to the orphaned prototype tree |
| `app/portal/[studio]/consultation/actions.ts` | NOT_TESTED |
| `app/portal/[studio]/messages/actions.ts` | NOT_TESTED |
| `app/portal/[studio]/projects/[id]/actions.ts` | NOT_TESTED |
| `app/portal/[studio]/settings/actions.ts` | NOT_TESTED |

## CRON ROUTES (from `vercel.json`)
See API section above (`/api/cron/*`) — cross-reference with `vercel.json`
schedule config during Phase Q.

## CORE JOURNEY — Consultation → AI Match → Quote → Stripe Deposit → Booking
Full real-studio journey run via `scripts/qa-full-studio-journey.mjs` against
live production. **6 of 7 steps PASS with real evidence; 1 P1 payment-routing
bug found (BLOCKED_NEEDS_SIAM, see EXHAUSTIVE_ISSUES.md), 1 minor script
limitation (not a bug, documented).**
- Consultation creation: PASS (DB-level, matching real schema; the live
  multi-step AI-chat wizard UI independently verified by the Client Portal
  pass's D1 test)
- AI Quote generation (`/api/ai/quote-generate`): PASS — real Claude call,
  realistic price range + reasoning returned and rendered
- AI Artist Match (`/api/ai/artist-match`): PASS — real Claude call correctly
  recommends the Traditional-styled artist over the Fine-Line one for a
  Traditional-described consultation
- Owner quote save (human-approval gate): PASS — DB-confirmed `status→quoted`,
  `final_price`/`final_sessions` persisted
- Owner "Generate Deposit Link": PASS functionally (real booking + real
  Stripe Checkout session created) — **but see P1 finding: charges the
  platform account, not the studio's connected account**
- Stripe TEST payment + webhook reconciliation: PASS — real payment,
  `deposit_payments.payment_status→paid`, `bookings.deposit_paid→true`,
  `consultations.status→deposit_paid` (the previously-fixed cross-table
  advance re-verified, still holds)
- Owner booking finalization (date/time): PASS — DB-confirmed `status→confirmed`
- Cross-role agreement: PASS — the assigned Artist sees the finalized booking
  with correct client name at `/artist/bookings/[id]`

**Separately, Stripe Connect payment reconciliation itself** (idempotency,
cross-studio-mismatch rejection, 0% application fee for a properly-connected
studio) re-run via the pre-existing `scripts/verify-connect-live.mjs` —
**13/13 checks PASS**, confirming the Connect payment infrastructure itself
is sound; the P1 finding is specifically that one particular caller
(`sendDepositRequest`) doesn't use it.

**Client Portal self-serve deposit path:** see EXHAUSTIVE_ISSUES.md P0 — a
**separate, more severe** finding: this path (`continueToDeposit`) correctly
fails closed on Stripe Connect (unlike the owner path above), which means it
currently cannot collect payment at all for any studio that hasn't connected
Stripe yet (today, that's every real studio).

## SUMMARY COUNTS
- Page routes inventoried: 76 (66 live/testable, 10 NOT_APPLICABLE orphaned/unreachable)
- API routes inventoried: 31
- Server action files inventoried: 26 (25 live, 1 NOT_APPLICABLE)
- **Total testable surfaces: 122**
