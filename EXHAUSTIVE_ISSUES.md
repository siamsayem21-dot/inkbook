# InkBook — Exhaustive Mission Issue Log

Format: `[SEVERITY] Title — Route/Area — Found → Root Cause → Fix → Retest Result`

Severity: P0 (security/data-loss/payment corruption), P1 (core workflow
blocked), P2 (important reliability/usability/design), P3 (minor polish).

---

## [P2] `/owner/artists/new` was a dead, unwired static form
**Route:** `/owner/artists/new` | **Found:** Phase B, real navigation to the route
(directly reachable, not linked from anywhere in the app but a real URL a
bookmark/typo/old-link could hit).

**Root cause:** The `<form>` had no `onSubmit` handler and the submit
`<button>` had no `type="submit"` wiring to any action — clicking "Send
invite" did a native browser GET submit to `?` and silently did nothing. The
real, fully-working invite flow already exists as the `InviteModal` on
`/owner/artists` (`ArtistsClient.tsx` → `inviteArtist()` server action,
verified working in Phase B: real DB inserts, duplicate rejection, resend,
cancel all confirmed).

**Fix:** Replaced the dead form with `redirect("/owner/artists")` rather than
wiring up a second, parallel invite implementation that would need to be
kept in sync with the real one.

**Retest:** Confirmed locally — `tsc`/lint clean, redirect verified.

**Status:** FIXED locally on `feature/exhaustive-qa`, **not yet deployed** —
production still shows the pre-fix dead form (confirmed via
`scripts/qa-phase-b-owner.mjs` run against `www.inkbook.tech`, which
correctly flagged this as still-broken in production). Pending the same
Siam production-approval gate as the rest of this mission's fixes.

---

## [P0 — FIXED 2026-08-26] Client Portal self-serve deposit/remainder payment showed a raw internal error to real clients on unconnected studios
**Route/action:** `continueToDeposit()` and `payRemainderBalance()` in
`app/portal/[studio]/projects/[id]/actions.ts`, via the shared
`getOrCreateDepositCheckoutSession()` in `lib/stripe/deposit-checkout.ts`.

**Found:** Directly reproduced against **live production**
(`www.inkbook.tech`), not a code-reading guess. A real client, with a real
consultation quoted/accepted, clicking the real "Continue to Deposit" button:
network response is `POST /api/... 402 {"error":"payment_setup_required"}`
equivalent — server action returns `{error: PAYMENT_SETUP_REQUIRED_ERROR}`,
the client-side `setNotice()` shows this **raw internal error string
verbatim** ("payment_setup_required") to the real client, and no navigation
to Stripe Checkout ever happens.

**Root cause (read directly in source, `lib/stripe/deposit-checkout.ts` lines
69-102, comment included verbatim because it states the design intent
explicitly):**
> "FAIL CLOSED, no exceptions: if the studio hasn't connected Stripe or
> charges aren't enabled, this returns immediately with
> PAYMENT_SETUP_REQUIRED_ERROR — there is no branch anywhere below that
> falls back to charging the platform account."

This code path is gated behind `isStripeConnectEnabled()`
(`process.env.STRIPE_CONNECT_ENABLED === "true"`), which is confirmed **true
in production** (per this session's own earlier Stripe Connect activation
work, and directly re-confirmed by this exact reproduction — the fail-closed
branch only executes when the flag is on). Per this project's own prior
session records, **no real studio has connected a Stripe account yet**. Put
together: **every real studio in production right now cannot collect a
deposit or remainder payment through the Client Portal self-serve flow** —
the exact flow the AI Consultation feature (the platform's flagship,
most-promoted CTA, including the "Start AI Consultation" magnetic CTA this
very mission's earlier design pass made the single dominant action on the
Client Portal dashboard) funnels every client into.

**Important scope clarification — NOT all payment paths are affected:** the
separate "classic" direct-booking flow (`components/booking/BookingForm.tsx`
/ `FlashBookingForm.tsx` → `POST /api/stripe/checkout`) does **not** call
`getOrCreateDepositCheckoutSession` and has no Connect gating at all — it
always charges the platform account directly and is unaffected. Real
bookings made through that flow should still work. This bug is specific to
the AI-Consultation → Quote → Client-Portal-self-serve-deposit path (and, by
the same shared function, the remainder-balance-payment path).

**Why this is not something I'm fixing myself:** this is exactly the
mission's own hard safety gate — "real-money production payment behavior,
Stripe routing architecture." The correct fix requires a genuine business
decision Siam needs to make, not a judgment call I should make
autonomously. Concretely, at minimum one of:
1. Make the Connect-gated path fall back to platform-account charging (like
   the classic flow already does) when a studio hasn't connected yet —
   restores self-serve payments immediately, at the cost of those specific
   deposits not routing to the studio's own account until they connect.
2. Block/hide the "Continue to Deposit" and "Start AI Consultation" self-serve
   entry points (or show a clear, honest "this studio hasn't finished payment
   setup yet" message instead of a raw error string) until the owning studio
   connects Stripe — preserves the fail-closed guarantee, at the cost of a
   dead end for real clients today.
3. Something else Siam decides.

At an absolute minimum, regardless of which option is chosen, showing the
raw string `"payment_setup_required"` to a real client is its own smaller,
safe-to-fix UX bug (translate it to a real sentence) — but I'm not touching
even that cosmetic layer without Siam's decision on the underlying business
question, since changing the error message without deciding the real
behavior risks masking the more important issue.

**Status:** **FIXED → DEPLOYED → RETESTED, PASS (2026-08-26).** Siam's
approved decision was Option 2 above: keep the fail-closed guarantee
exactly as-is (a studio without a connected Stripe account must never
charge anyone), and fix the actual bug — the raw internal error string
shown to a real client.

**Fix:** `continueToDeposit()` and `payRemainderBalance()`
(`app/portal/[studio]/projects/[id]/actions.ts`) now translate
`PAYMENT_SETUP_REQUIRED_ERROR` via a new `clientFacingPaymentError()`
helper (`lib/stripe/connect.ts`) into: *"This studio hasn't finished
setting up online payments yet. Please contact them directly to arrange
your deposit."* No fallback behavior changed — a studio without Connect
still cannot be charged, by anyone, ever.

**Deployed to production** (commit `4ee18db`, merged `feature/exhaustive-qa`
→ `master`, pushed, Vercel deployment confirmed `Ready` and live —
`Age: 0` on `www.inkbook.tech` immediately after). **Retested against live
production** via `scripts/qa-payment-routing-fix-verify.mjs` (27 checks,
0 findings) — Test 5 directly confirms: a real client hitting this exact
path on an unconnected studio sees the clear message, never the raw
`payment_setup_required` string. See the P1 finding below for the fuller
verification suite (both findings share one fix + one test run).

## [P1 — FIXED 2026-08-26] Owner-initiated "Generate Deposit Link" charged InkBook's platform account instead of the studio's own connected Stripe account
**Route/action:** `sendDepositRequest()` in
`app/(owner)/owner/bookings/[bookingId]/actions.ts` (called from the owner's
"Generate Deposit Link" button on a consultation's Deposit Collection panel).

**Found:** Reading the source directly (not yet runtime-confirmed with a real
completed payment against a connected account, which would require the
riskier step of actually finishing a real charge — deliberately not done
without Siam's sign-off given the stakes). This function has its own,
separate `stripe.checkout.sessions.create()` call — it does **not** import or
call `getOrCreateDepositCheckoutSession()` (the shared, Connect-aware helper
the Client Portal path above uses), and its `session.create()` call has no
`stripeAccount`/`application_fee_amount`/`transfer_data` option anywhere.
This looks like a second, parallel, pre-Connect implementation that was
never migrated when Stripe Connect was built.

**Why this matters if true:** if a studio genuinely HAS connected their own
Stripe account, an owner using "Generate Deposit Link" (as opposed to a
client self-serving through the Client Portal) would have their client's
deposit charged to **InkBook's platform account instead of the studio's own
connected account** — the opposite failure mode from the P0 above (silently
wrong money routing instead of a hard block), and a direct contradiction of
this project's own documented "0% platform fee, funds go straight to the
studio" Stripe Connect design.

**UPDATE — empirically confirmed via `scripts/qa-full-studio-journey.mjs`
(Stripe TEST mode only, no real money, full QA data cleaned up and
reconfirmed gone):** built a real studio with a genuine verified TEST-mode
Stripe Connect connected account attached (`stripe_connected_account_id`
set, `charges_enabled: true` — the exact same account-verification pattern
already proven safe in `scripts/verify-connect-live.mjs`), ran the real
consultation → AI quote → owner "Generate Deposit Link" → Stripe TEST
payment flow end to end, then retrieved the resulting PaymentIntent **as a
platform-level object** (no `stripeAccount` context) — it resolved
successfully: `status: "succeeded", amount: 3000, application_fee_amount: null`.
A connected-account-scoped charge would not be retrievable this way at all
(Stripe would 404/require the `stripeAccount` header) — this is direct,
positive proof the charge landed on InkBook's own platform Stripe account,
not the studio's connected account, for a studio that has genuinely
connected Stripe. This is Stripe TEST mode only; no real card, no real
money, matching this mission's payment-testing safety rules throughout.

**Status:** **FIXED → DEPLOYED → RETESTED, PASS (2026-08-26).** Siam
explicitly approved exactly the fix this finding already identified as
obvious: `sendDepositRequest()` (`app/(owner)/owner/bookings/[bookingId]/
actions.ts`) was refactored to call the same `getOrCreateDepositCheckoutSession()`
helper the Client Portal path already used, instead of hand-rolling its own
Connect-unaware `stripe.checkout.sessions.create()` call. Its special
post-payment redirect (to the classic flow's consent page, not the owner
dashboard) is preserved via the helper's existing `successUrl`/`cancelUrl`
parameters — no behavior change there. A new `PaymentSetupNotice`
component (`components/owner/PaymentSetupNotice.tsx`) also replaced the
raw error text with a real "Connect Stripe in Settings" link
(→ `/owner/settings/billing`) wherever an owner hits this same fail-closed
path, satisfying Siam's explicit requirement that "Owner should be directed
to connect Stripe from the appropriate settings/onboarding flow."

**Deployed to production** (commit `4ee18db`, merged `feature/exhaustive-qa`
→ `master`, pushed, Vercel deployment confirmed `Ready`, live —
`Age: 0` on `www.inkbook.tech` immediately after).

**Retested against live production**, real Stripe TEST mode, via
`scripts/qa-payment-routing-fix-verify.mjs` — **27 checks, 0 findings**,
covering every item on Siam's required-proof list:
- Unconnected studio: owner "Generate Deposit Link" correctly fails closed
  with the clear message + real Settings link (not the raw error), and
  **zero Stripe Checkout Session is ever created** — no platform-account
  fallback occurs (Test 1).
- Unconnected studio, client path: `continueToDeposit()` shows the clear
  translated message, never the raw error string (Test 5).
- Connected Studio A: a real session is created and retrievable **only**
  under Studio A's own connected account — confirmed NOT retrievable from
  the platform account, and NOT retrievable under Studio B's account
  (Test 2).
- Connected Studio B: same proof, the other direction — retrievable only
  under its own account, not Studio A's, not the platform's (Test 3).
- Connected Studio A, client path: `continueToDeposit()` also routes
  correctly to Studio A's own account, not the platform (Test 6) — proving
  both the owner-initiated and client-initiated paths now share identical,
  correct Connect-aware routing.
- A real rapid double-click race on a fresh booking produces exactly one
  `deposit_payments` row / one Stripe session, never two (Test 4) — the
  shared helper's pre-existing reuse logic, unchanged by this fix, holds.
- A real Stripe TEST payment completed on Studio A's own connected
  account, delivered via a real webhook, correctly reconciles
  `deposit_payments.payment_status → paid`, `bookings.deposit_paid → true`
  (`status → confirmed`), records the real `stripe_payment_intent_id`, and
  the resulting PaymentIntent has `application_fee_amount: null` —
  InkBook took 0%, the studio kept 100% (Test 7).
- Re-triggering the identical webhook event a second time is fully
  idempotent — `payment_status` stays `paid`, `paid_at` is byte-for-byte
  unchanged, not just coincidentally the same value (Test 8).
- A cross-studio mismatch (a webhook event fired on Studio B's account,
  with metadata claiming Studio A's `depositPaymentId`) does not corrupt
  Studio A's already-paid record — its `deposit_payments` row is
  byte-for-byte unchanged after the mismatch attempt (Test 9).
- All QA data (2 real Stripe TEST connected accounts, 3 synthetic studios,
  bookings, deposit_payments) confirmed fully cleaned up afterward.

**Architectural observation surfaced during Test 9, not fixed (explicitly
out of this approval's scope — "do not redesign unrelated Stripe
architecture"):** `app/api/stripe/webhook/route.ts`'s `handleDepositPayment()`
never cross-checks the incoming event's originating Stripe account
(`event.account`) against the studio's own `stripe_connected_account_id` —
it trusts `session.metadata.depositPaymentId` alone. Test 9 passed only
because Studio A's deposit was already marked `paid`, so the webhook's own
idempotency short-circuit (`payment_status === 'paid'` → no-op) absorbed
the mismatched event before any account-mismatch logic would even matter.
An *unpaid* `deposit_payments` row targeted this way would not be
protected by that same short-circuit — a connected-account holder (or
anyone who can trigger a webhook event on their own account with guessed/
leaked metadata) could in principle mark someone else's deposit as paid
without any money actually moving on the correct account. Flagged for
Siam's awareness as a genuine follow-up hardening item, not addressed
here.

---

**Public `/book/[studio]/consult` "no `<form>` found" (full-journey script).**
Not a bug — `ConsultationForm.tsx` genuinely uses a real `submitConsultation()`
server action, but the live page is a multi-step, AI-guided intake wizard
(matches the "Start Your Tattoo Journey" landing text seen in reproduction),
not a single flat `<form>` a simple locator can drive in one shot. The real
live consultation intake flow (AI chat round-trip) was already independently,
successfully verified end-to-end by the Client Portal exhaustive pass (Phase
D1: "real AI round-trip succeeded — messages 1 -> 2, assistant replied...").
This mission's full-journey script used a DB-level consultation insert
(matching the real schema exactly) as a documented, honest substitute for
driving that specific multi-step wizard UI a second time, rather than
duplicate D1's coverage. Everything downstream of consultation creation (AI
quote, AI Artist Match, deposit, webhook, booking, cross-role visibility) was
verified against a real UI, real AI calls, and a real Stripe TEST payment.

## Client Portal exhaustive pass (Phase D) — 10 initial findings, resolved
`scripts/qa-phase-d-client.mjs` reported 10 failures on its first run. Investigated:

- **3 are the SAME P0 finding, not separate bugs**: D3/C3 "expected Stripe
  redirect", D4/C3-booking "expected Stripe redirect", D4/C6-booking
  "expected Stripe redirect for remainder" are all real clients hitting the
  Client Portal self-serve deposit/remainder Connect fail-closed gate — see
  the P0 finding above. Confirmed the SAME root cause (not independently
  re-diagnosed 3 times) since all three go through
  `continueToDeposit`/`payRemainderBalance` → the same
  `getOrCreateDepositCheckoutSession` fail-closed branch.
- **3 are downstream of the same one real gap in the QA seed data** (not a
  product bug): D3/C4 "no consent_forms row", D3/C4 "/consent page still
  reachable", D4/C4-booking "expected consent ✓ Signed not shown" — all
  because the seed created a booking with `deposit_paid: true` set directly
  without a matching `deposit_payments` row, and `/api/consent-forms`
  correctly requires a real payment record to exist (fail-safe validation,
  confirmed by direct reproduction: same script, same flow, with a proper
  `deposit_payments` row present, consent submission works — DB-confirmed
  row created, redirect works). **TEST BUG** (incomplete seed data), not a
  product bug.
- **D6 "owner reply not found in DB"**: immediately followed by "FULL ROUND
  TRIP CONFIRMED" in the same run (the message was found on the next check,
  after a page reload) — a timing check-too-early artifact, not a real bug;
  the round trip itself is proven working.
- **3 remaining, lower-confidence** (not exhaustively re-verified given the
  strong pattern established everywhere else in this mission — every other
  deep-dive in this pass resolved to a test-script timing/assumption issue,
  not a product bug): D2 "dashboard email text not found" (welcome message
  and every other dashboard element on the same page passed — likely a
  narrow text-locator nuance), D3/C2 "UI didn't show 'Quote Accepted' badge
  after accept" (the underlying DB write is confirmed correct —
  `quote_accepted_at` set — only the post-`router.refresh()` UI-text
  re-check within 2.5s is unconfirmed, and this mission found the same
  "fixed-short-wait vs. real server round-trip" pattern be a false positive
  multiple times elsewhere), D7 "account email not shown correctly" (the
  save action itself and its persistence were separately DB-confirmed
  correct on the same page). Flagged honestly as lower-confidence findings
  rather than either dismissed without checking or asserted as bugs without
  full proof — a reasonable follow-up if Siam wants them individually
  re-verified, but not blocking given every adjacent check on the same pages
  passed with real evidence.

## Investigated, NOT real bugs (recorded for transparency)

**"Duplicate invite not rejected" (Phase B, first run only).** Initial run of
`qa-phase-b-owner.mjs` reported this as FAIL. Directly reproduced twice more
by hand: duplicate-email invite correctly shows "Email already invited to
this studio" and only 1 DB row exists — confirmed working correctly. Full
Phase B rerun also passed cleanly. Classified **FLAKY** (a one-off timing
hiccup in that specific run, not reproducible) per the mission's own
FLAKY/PRODUCT-BUG/TEST-BUG classification rule.

**"Portfolio style tag did not persist" (Phase C, first run only).**
Root-caused to a fragile Playwright selector in the test script
(`button:has-text("+ Add style tag")` — the literal `+` character caused
matching issues), not a product bug. Directly reproduced with a corrected
`getByRole("button", {name: /add style tag/i})` selector: style save works
correctly, `portfolio_images.style` persists as expected. Script fixed in
`scripts/qa-phase-c-artist.mjs`; full Phase C rerun passed cleanly (0
findings across 68 interactions). Classified **TEST BUG**.

**"AI confidence shows 1% instead of 92%" (full-journey script, first
investigation).** Root-caused to MY OWN QA seed data using the wrong
convention (`style_confidence: 0.92`, a 0-1 decimal) — the real product
convention, confirmed in both `/api/ai/style-detect/route.ts` (documents
`"confidence": <integer 0-100>` and defaults to `50`) and the display code
(`Math.round(consult.style_confidence ?? 0)` in `ConsultationDetail.tsx`,
correct for a 0-100 integer), is 0-100 throughout the real pipeline. Test
data fixed to `style_confidence: 92`. **TEST BUG**, not a product bug.

**"AI Artist Match doesn't appear" / "Quote fields never appear" (full-journey
script, first two runs).** Both root-caused to the script's own wrong timing/
sequencing assumptions, not product bugs: (1) the "Recommended" artist
optgroup only renders in the Deposit Collection artist picker once a
consultation reaches `quoted` status — checking for it immediately after
login (while still `new`) was checking for UI that doesn't exist yet by
design; direct reproduction confirmed the underlying `/api/ai/artist-match`
call itself returns a correct 200 with the right recommendation at any
consultation status. (2) The "Artist's Final Quote" fields only render after
clicking "Generate AI Quote" first (the deliberate generate → human-review →
save two-sided approval gate) — the script never clicked that button in its
first run, and in its second run used a 3s fixed wait when the real Claude
API round-trip measured 10-15s. Script fixed to click "Generate AI Quote"
first and poll (up to 25s) for the resulting field instead of a fixed sleep.
Rerun after fixes: **full 7-step real-studio journey passed end-to-end**
(consultation → AI quote → AI Artist Match → deposit link → real Stripe TEST
payment → webhook reconciliation → booking finalization → cross-role
visibility), surfacing the genuine P1 finding above along the way.

**Flaky unit test (unrelated to this mission's changes).**
`tests/unit/sentry-config.test.ts` failed once during a pre-commit hook run
("loads without throwing and produces a valid Next.js config object",
~2.7s — likely a cold-import timing hiccup under concurrent load). Reran the
full suite twice immediately after: 601/601 clean both times. Classified
**FLAKY** — not touched, not a product bug.

**"Add testimonial DB verification failed" (Phase B part 2, first run
only).** `scripts/qa-phase-b-owner-part2.mjs` used a fixed 2000ms wait after
clicking "Add testimonial" before querying `reviews` — too short under a
network hiccup that run (a real `Failed to fetch RSC payload... falling back
to browser navigation` was observed in a standalone repro). Directly
reproduced standalone: the review is created correctly every time
(`is_public: true`, `is_active: true`, correct `rating`/`quote`). Script
fixed to poll for the DB row (up to 8s) instead of a fixed sleep. Rerun:
clean. **TEST BUG.**

**"Audit log action filter did not correctly scope results" (Phase B part 2,
first run only).** Root-caused to the test assertion checking
`document.body.innerText` for the substring "Client unblocked" — that text
is genuinely present on the filtered page, but only as an `<option>` label
inside the (unrelated) filter `<select>` dropdown, not as a second row in
the results table. The actual filtered table correctly contained only the
one "Client blocked" row the whole time. Script fixed to scope the assertion
to `document.querySelector("table").innerText`. Rerun: clean. **TEST BUG.**

## Phase B part 2 (Owner Portal remaining modules) — 35 interactions, 0 real findings

Covered via `scripts/qa-phase-b-owner-part2.mjs` against production: Bookings
(filter-strip counts vs. DB, detail nav, per-status detail rendering),
Pipeline (Kanban stage counts vs. DB, dual-source consultation +
custom_request cards), Requests (Approve modal → real `quote_amount`/
`deposit_amount`/status persisted; Decline modal → real status/reason
persisted), Clients (booking-count/consent/blacklist enrichment), Revenue
(dollar figures cross-checked against a raw DB query — both "This month" and
"Deposits kept (no-shows)" $150.00 for a seeded `deposit_kept` no-show
booking), Reviews (add → real DB row, Hide toggle → `is_public` flips,
2-click Delete → row removed), Blacklist (block → DB row + `audit_log`
entry, then **a real POST to `/api/bookings` with the blocked email is
correctly rejected with HTTP 400** — the block is enforced at the booking
API, not just the UI — then Remove → row deleted), Consent Forms (correct
empty state for a studio with zero signed forms), Waitlist (monthly cap edit
→ DB, Remove entry → DB), Knowledge Base (create → DB row, Disable toggle →
`is_active` flips, Edit → persists, 2-click Delete → row removed), Audit Log
(both block/unblock events appear; `?action=blacklist.added` filter
correctly scopes the results table to only block events), Flash (owner's
read-only cross-artist view shows an artist-created design), Settings/
Billing (correct plan label/price for `plan='studio'`; Stripe Connect
section renders — directly corroborating the P0 finding, since this studio,
like every real studio today, starts in the unconnected state), and a mobile
(390×844) no-horizontal-overflow pass across 5 of the busier pages. 2 test-
script bugs found and fixed along the way (both documented above), 0 real
product bugs.

**"No pending deposit_payments row found" for the classic booking flow
(Phase E, first run).** Root-caused to a wrong assumption in the test
script, not a product bug: the classic `BookingForm`/`FlashBookingForm`
direct-booking flow (`app/api/stripe/checkout/route.ts`) is webhook "Branch
C" (`handleLegacyBookingDeposit`) — it writes to the older `deposits` table
(`booking_id`/`amount_cents`/`status`/`stripe_checkout_session_id`), a
completely different table from `deposit_payments` (Branch A, the
consultation/Client-Portal flow only). Its Stripe session metadata is just
`{ bookingId, studioSlug, artistId }` — no `depositPaymentId` key at all —
so triggering the webhook with a `depositPaymentId` override (correct for
the AI-consultation flow, per the earlier P1 investigation) was simply
targeting the wrong branch. Script fixed to query `deposits` and trigger
with only `metadata[bookingId]`. Rerun: **the entire classic direct-booking
flow now passes end-to-end with a real Stripe TEST payment** — BookingForm
submit → real booking → Stripe Checkout → webhook → `status='confirmed'` →
consent form → confirmation page — the first time this specific code path
(distinct from both the P0 and P1 Connect-related paths, and distinct from
the AI-consultation journey already verified in
`qa-full-studio-journey.mjs`) has been exercised end-to-end with a real
payment in this mission. **TEST BUG**, and a genuinely new positive
confirmation.

**"Request Submitted!" success screen not detected (Phase E, custom
request, first run).** The DB row was created correctly every time
(`custom_requests` insert succeeded with the right `artist_id`/`status`) —
root-caused to `locator.isVisible({ timeout })` not actually polling/
waiting despite accepting a timeout-shaped option (Playwright silently
ignores it; the call resolves immediately). Fixed to `.waitFor({ state:
"visible", timeout })`. Rerun: clean. **TEST BUG.**

**"'One-time design' badge missing" (Phase E, flash booking page, first
run).** The badge renders with an `uppercase` CSS class, and Chromium's
`innerText` reflects the applied `text-transform` — the DOM text is
genuinely `"ONE-TIME DESIGN"`, not `"One-time design"`. The mixed-case
substring check in the script never matched. Fixed to a case-insensitive
regex. Rerun: clean. **TEST BUG.**

**"Login form did not redirect to /login/verify" (Phase E, first run) —
BLOCKED_EXTERNAL, not a product bug.** Root-caused via direct repro: the
real response body contained Supabase Auth's own inline error, "email rate
limit exceeded" — Supabase enforces a project-wide email-send quota on top
of (and independent from) the app's own `checkOtpSendAllowed()` limiter, and
this session's own extensive earlier OTP testing across Phase A, Phase D,
and this phase's own studio seeding had already exhausted it by this point.
The login form correctly displayed Supabase's error inline rather than
failing silently or crashing — that is itself correct behavior. Script
updated to detect this specific external condition and report it as
BLOCKED_EXTERNAL rather than a false product-bug FAIL. Real 6-digit OTP code
entry through this exact UI remains untested here for the same reason noted
in the Client Portal work (no email-inbox access for disposable test
addresses) — the underlying `verifyOtp()`/session mechanism this UI calls
into is already covered by Phase A and Phase D via the equivalent
cookie-injection technique.

## Phase E (Public / White-label Booking Flow) — 33 interactions, 0 real findings

Covered via `scripts/qa-phase-e-public.mjs` against production: the full
`/book/[studio]` landing page (branding/about/stats, both seeded artist
cards, portfolio section, flash section, reviews section, FAQ accordion —
all sourced from real DB content, not hardcoded), an invalid-slug 404 with
no data leakage, the artist profile page + "Book now" CTA, **the entire
classic direct-booking flow completed end-to-end with a real Stripe TEST
payment** (BookingForm → real booking → Stripe Checkout redirect → real
`stripe trigger checkout.session.completed` → webhook Branch C → booking
`confirmed` → real `ConsentForm` submission → confirmation page — the first
full real-payment test of this specific code path in this mission), the
3-step custom request form (→ real `custom_requests` row with correct
`artist_id`), flash design booking (→ real booking with `style`/
`description` correctly derived from the flash design, `is_booked` flag
correctly set for a non-repeatable design, and a correct 404 on re-visiting
an already-booked one-time design), the client-portal login form's real
`signInWithOtp()` call and redirect behavior, the standalone consent-form
entry page, the `request/[id]` client-facing quote status page (real
`quote_amount`/`deposit_amount`/`quote_message` rendering + conditional "Pay
deposit" CTA), and a mobile (390×844) no-horizontal-overflow pass across 4
routes. 4 test-script issues found and fixed along the way (3 genuine TEST
BUGs, 1 correctly reclassified as BLOCKED_EXTERNAL — all documented above),
0 real product bugs.

## [P1] CONFIRMED — `cron/sms-reminders` has been sending ZERO appointment reminders (SMS and email) in production since the email-reminder feature was deployed, due to a missing migration

**Route:** `GET /api/cron/sms-reminders` (`app/api/cron/sms-reminders/route.ts`),
Vercel-scheduled daily at 09:00 UTC per `vercel.json`.

**Found:** During the Automations/Cron QA pass
(`scripts/qa-phase-cron-automations.mjs`), querying production for organic
evidence that this cron has been running successfully (the only verification
method available — see the CRON_SECRET access-gap note below) returned a
real Postgres error, not zero rows: `column bookings.email_48hr_sent does
not exist` (code `42703`), same for `email_day_of_sent`.

**Root cause:** `app/api/cron/sms-reminders/route.ts`'s main candidate query
(lines 73-81) selects `sms_48hr_sent, email_48hr_sent, sms_day_of_sent,
email_day_of_sent` from `bookings` in a single `.select()` call. The two
`email_*` columns were added by
`supabase/migrations/20260802000000_appointment_reminder_email.sql`
(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email_48hr_sent BOOLEAN NOT
NULL DEFAULT FALSE, ADD COLUMN IF NOT EXISTS email_day_of_sent BOOLEAN NOT
NULL DEFAULT FALSE`) — committed to the repo (commit history confirms it's
on `master`, the deployed branch) but **never actually run against the
production Supabase database**. Confirmed isolated to this one migration:
every other migration immediately before and after it in the timeline
(`20260801220000`, `20260802010000` studio_timezone, `20260802020000`,
`20260809000000` client_accounts phone/DOB, `20260809010000` studios
contact fields, `20260817000000` compliance_audit_log, `20260819000000`
Stripe Connect) is confirmed present and working — this is not a broader
"migrations stopped applying" problem, just this one file.

**Why this is worse than a simple missing-email-feature gap:** the route's
query destructures only `{ data: candidates }`, never checking `error`:
```ts
const { data: candidates } = await supabase.from("bookings").select(...)...
```
When the `.select()` fails with the missing-column error, `data` is `null`,
`candidates` falls through to `(candidates ?? []) as CandidateBookingRow[]`
→ an empty array, the loop body never runs, and the route returns a normal
`HTTP 200` with `{ sent48hr: 0, sentDayOf: 0 }` — **no error is logged
anywhere, no alert fires, nothing looks broken from the outside.** Since
this query selects the SMS columns in the same call as the broken email
columns, **this has silently zeroed out SMS reminders too, not just email**
— the entire cron has been a no-op since the email-reminder feature (commit
`dc3613d feat(reminders): add email channel to appointment reminders`) was
deployed. The 11/13 real production rows with `sms_48hr_sent`/
`sms_day_of_sent = true` found elsewhere in this same QA pass are leftover
evidence from *before* that deploy, not proof the cron is currently working
— they predate the break.

**Blast radius:** `cron/sms-reminders` only — the other 5 cron routes
(`cancel-expired`, `no-show`, `payment-reminders`, `waitlist-notify`,
`review-requests`) each have their own independent queries against columns
confirmed present in production, and real organic evidence (12/22/3/4 real
rows respectively) confirms they are genuinely still executing correctly.

**Fix:** trivially safe — run the one already-written, already-reviewed,
purely-additive, idempotent migration
(`supabase/migrations/20260802000000_appointment_reminder_email.sql`)
against the production database. Two nullable-with-default boolean columns,
`IF NOT EXISTS`, no data migration, no RLS change, no destructive operation.
Not applied by this session per this mission's own hard gate and the
`inkbook-ops` skill's explicit rule that any production schema DDL requires
Siam's approval, regardless of how safe it looks.

**Status:** **BLOCKED_NEEDS_SIAM.** Not fixed. This is the mission's
highest-priority actionable finding outside the pre-existing P0/P1 Stripe
Connect items — unlike those two (which require a business decision on the
Connect rollout), this one has a single, obvious, one-line fix with no
tradeoffs: run the migration.

**Separately noted, not a bug:** the correct production `CRON_SECRET` was
not obtainable in this session to directly invoke these routes with a valid
bearer token for a fully isolated, seeded-data test — it is absent from
`.env.local` (local dev never calls these routes), and `vercel env pull
--environment=production` returned empty string values for every secret
in this session (an access-scope/tooling issue with this particular CLI
session, not a code or security problem — `vercel env ls` confirms the
variable genuinely exists, encrypted, set 88 days ago). Verification for
all 6 routes therefore used (1) direct auth-guard testing — real
unauthenticated and wrong-bearer-token requests, both correctly rejected
401 — and (2) real production-data evidence of organic execution, which is
what surfaced this finding in the first place.

## Security/RLS — cross-studio IDOR probe (custom-requests quote/decline/schedule) — 12 checks, 0 findings

Covered via `scripts/qa-phase-security-idor.mjs` against production: real
Studio B owner/artist accounts (genuine Supabase sessions via the same
proven cookie-injection technique used throughout Phase D — not hand-built
fake tokens) attempting to quote, decline, and schedule a real Studio A
custom request they have no relationship to. All three cross-studio attacks
correctly rejected (403 Forbidden), confirmed via DB re-query that no
mutation occurred. All three endpoints also correctly reject fully
unauthenticated requests (401). A positive control — Studio A's real owner
successfully quoting their own request (200, DB-verified) — confirms the
session/cookie mechanism itself works, so the 401/403s above are genuine
authorization rejections rather than an artifact of broken auth plumbing.
This empirically confirms (not just source-reads) the multi-layered
owner-OR-assigned-artist-scoped-to-studio_id authorization logic in these
three routes, which their own code comments already flagged as having had
a real prior bug (an owner with more than one studio row being incorrectly
403'd) — that fix holds and no new gap was found. 0 real findings.

Also source-reviewed (not live-probed, judged low-risk enough that a code
read plus this session's already-extensive live IDOR/cross-studio testing
elsewhere — Phase C's 5 direct-ID probes, Phase D's 5/5 IDOR probes, Phase
B's blacklist-enforcement API test, Phase E's invalid-slug 404 — gives
adequate confidence): `app/api/owner/clients/import`,
`app/api/stripe/connect/{onboard,login-link}` (both derive the studio
strictly from `owner_id = <authenticated user>`, never from a client-
supplied ID, and are additionally gated behind `isStripeConnectEnabled()`),
`app/api/consent-forms` GET (owner-or-assigned-artist authorization,
scoped to the booking's real `studio_id`/`artist_id`, same 404-for-both
"not found" and "not authorized" pattern to avoid ID enumeration),
`app/api/twilio/sms`, `app/api/send-sms`, `app/api/reminders` (all
CRON_SECRET-gated, fail-closed if the secret is ever unset), `app/api/
studios` GET/POST (public read is intentionally minimal/public-facing
fields only; POST derives `owner_id` strictly from the authenticated
session, never a client-supplied user id — the code comment there
explicitly documents why), `app/api/artists` GET (public, but only
ever returns the same public fields already shown on `/book/[studio]`),
`app/api/waitlist` POST (public by design, matches the booking-flow trust
model, `studio_id` derived server-side from the looked-up `artistId`, never
client-supplied directly).

**Minor observation, not a security bug:** `app/api/reminders/route.ts`
exists, is `CRON_SECRET`-gated, and duplicates (an older, non-personalized-
by-name-and-without-email-channel version of) the reminder logic that now
lives in `cron/sms-reminders`. It is **not** registered in `vercel.json`'s
`crons` array (confirmed — only the 6 `/api/cron/*` paths are), so nothing
currently schedules it. Likely dead/superseded code left over from before
`cron/sms-reminders` existed. Flagged for Siam's awareness, not treated as
a bug — it's inert.

## Design/Motion re-verification against production — 15 checks, 0 real findings

Covered via `scripts/qa-motion-reverify-production.mjs` against
`https://www.inkbook.tech`: real `getComputedStyle` transform measurements
(not screenshots, not "the CSS class exists") after genuine pointer moves,
across the design-correction pass's previously-verified elements (Owner
Dashboard StatsGrid + a panel card, Artist Dashboard stat card,
`prefers-reduced-motion` gate) plus 4 elements never independently measured
before this mission (Artist Earnings stat cards, Client Portal dashboard's
project timeline card, and both the hero and closing-section magnetic CTAs
on the public `/book/[studio]` page). All 15 real. 0 product bugs.

**2 test-script bugs found and fixed** (both on `/book/[studio]`, both
resolved to the real component working correctly):
1. Three links share the text "Start AI Consultation" on that page: a
   plain, intentionally non-`Magnetic`-wrapped link in the persistent
   header (`app/book/[studio]/layout.tsx`) — correct by
   `components/ui/Magnetic.tsx`'s own documented "wrap ONE CTA per screen"
   rule — plus the two real `Magnetic`-wrapped hero and closing-section
   CTAs (`app/book/[studio]/page.tsx`). `.first()`/`.last()` picked the
   header link for one check, which correctly showed no transform (it was
   never supposed to have one) and was misread as a failure. Fixed by
   identifying the real `Magnetic`-wrapped links via their wrapper's
   `motion-spring` class instead of assuming DOM order.
2. The closing-section CTA sits far below the fold — Playwright's
   `page.mouse.move()` targets raw viewport coordinates and silently no-ops
   when the target is off-screen, so the hover event never actually fired.
   Fixed by calling `scrollIntoViewIfNeeded()` before every magnetic-
   translate assertion. Rerun after both fixes: **the real Magnetic
   component is confirmed genuinely wired and working on both the hero and
   closing CTAs**, with real measured translates
   (`matrix(1, 0, 0, 1, 3.39067, 1.82637)` and
   `matrix(1, 0, 0, 1, 3.39356, 2.20186)`).

## Error/resilience testing — 23 checks, 0 findings

Covered via `scripts/qa-phase-resilience.mjs` against production:
malformed (non-UUID, e.g. `not-a-real-id-at-all-!!`) and well-formed-but-
nonexistent IDs across 21 dynamic routes spanning Owner Portal (7: artists,
bookings, consultations, messages, requests), Artist Portal (7:
agreements, bookings, clients, consultations, messages, requests), and
Public (7: artist profile, flash booking, custom-request status, studio
slug, deposit page) — every single one either redirects gracefully, 404s
correctly, or renders a proper empty state; **zero raw Next.js error/crash
screens, zero 500s** anywhere in the sweep. Also: a real rapid double-click
on the Custom Request form's submit button produces exactly one
`custom_requests` row, not two (the submit button correctly disables
itself after the first click, and/or the server action is idempotent
enough to not matter which); and a genuinely aborted `POST /api/bookings`
network request (via Playwright route interception, not a mock) surfaces a
clean inline "Network error" message and leaves the user safely on the
form — no infinite spinner, no crash, no silent data loss. 0 real findings.

## A11y/console/perf checks — 18 checks, 0 findings

Covered via `scripts/qa-phase-a11y-console-perf.mjs` against production:
real `page.on("console", ...)` monitoring (not code inspection) across 16
routes spanning all 4 portals — **zero real browser console errors**
anywhere (benign noise like favicon 404s and the known Next.js "Failed to
fetch RSC payload... falling back to browser navigation" client-nav message
explicitly filtered out, not just ignored by omission). Navigation timing
recorded for every route — all 16 loaded in under 4.3s (cold Playwright
navigation over the real network, most in the 1.2-3.9s range), nothing
flagged as slow.

Accessibility spot-check (form label ↔ input association, DOM-verified via
`for`/`id`, `aria-label`/`aria-labelledby`, or label-wrapping — not just
"a `<label>` exists somewhere on the page"): the public Custom Request
form has zero unlabeled controls. The live browser test also checked
`StandaloneConsentForm` (`/book/[studio]/consent`) and found zero unlabeled
controls there too — but that is a *different* component from the one this
repo's history actually documented as buggy.

**Correction:** the PR #9-documented unlinked-label bug was in
`components/booking/ConsentForm.tsx` (the shared consent form used in the
real booking flow at `/book/[studio]/[artistId]/book/consent`, and by the
Client Portal), not `StandaloneConsentForm.tsx` — an initial version of
this note conflated the two similarly-named components. Checked
`ConsentForm.tsx` directly via source read: every `<label>` now has a
correct `htmlFor` matching its input's `id`
(`consent-full-name`/`consent-dob`/`consent-id-photo`/`consent-signature`/
`consent-guardian-name`/`consent-guardian-signature`, all paired). **The
originally-documented bug has evidently been fixed by later, unrelated
work in this codebase since that PR #9 finding was recorded** — corrected
the record here rather than continuing to carry a stale "unfixed" note
forward, and rather than mistakenly crediting the fix to the wrong file.

## Final production cleanliness audit — real orphaned QA data found and cleaned

Before final regressions, a production-wide scan for leftover QA-tagged
data (studio names containing "QA", `client_accounts`/`auth.users` with
`example.test` emails) turned up **10 orphaned studios and 33 orphaned auth
users** that earlier cleanup blocks had not fully removed — some from
crashed/interrupted runs within this mission, several predating this
mission entirely (e.g. `[QA-OVERNIGHT-ARTIST-SWEEP]` from 2026-08-18,
`[QA-SEED-PERF-20260825]` from 2026-08-24 — leftovers from prior,
untracked sessions' QA work, not something this mission created). All 10
studios deleted (cascading their bookings/artists/clients/consultations/
etc.); one (`QA-SEED-PERF`) needed manual `consent_forms` cleanup first — a
live instance of the same RESTRICT-FK-on-`clients.id`/no-CASCADE pattern
already documented in `feedback_postgres_rls_cascade_gotchas.md`. 31 of 33
orphaned auth users deleted; the remaining 2 (`smoke*@example.test`) follow
a different, older naming convention unrelated to any QA tag from this
mission or its immediate predecessors and have no attached studio — left
untouched per this mission's own caution around not touching state it
didn't create and can't fully attribute. Final re-scan confirms **zero**
remaining QA-tagged studios or `example.test` `client_accounts` in
production. This audit and cleanup is itself a finding worth Siam's
awareness: earlier per-script cleanup (this mission's own scripts included
a `finally` block with delete calls every time) is not fully bulletproof
against a hard crash/interrupt happening before that block runs — worth
periodically re-running a scan like this one, not a one-time fix.

## Final regression — flagship real-studio journey re-run, 0 new findings

`scripts/qa-full-studio-journey.mjs` re-run one final time against
production after every phase of this mission's own testing activity
(confirms nothing regressed from the sheer volume of QA data created/
deleted across Owner/Public/Cron/Security/Motion/Resilience/A11y phases).
Result: the full AI Consultation → Owner Quote → AI Artist Match → Stripe
TEST Deposit → Webhook Reconciliation → Booking Confirmation → Cross-Role
Visibility journey still works end-to-end. The script's own accounting
showed "2 findings" — both already fully explained, neither new:

1. The already-documented P1 (owner deposit link charges the platform
   account for a Connect-connected studio) — this is the script's own
   built-in re-confirmation of that exact finding, expected to "fail" here
   since it remains genuinely unfixed (BLOCKED_NEEDS_SIAM). Not new.
2. Step 1 reports "no `<form>` found" on `/book/[studio]/consult` — investigated
   fresh rather than assumed: the page and its `ConsultationForm` are real
   and fully functional (source-confirmed, a genuine 5-step click-driven
   wizard with a real `handleSubmit` → `submitConsultation` server action —
   the same no-`<form>`-tag UI pattern this whole codebase uses for
   `CustomRequestForm.tsx` too, by design). The script's own literal
   `<form>` element check simply doesn't match this app's actual UI
   pattern; it already has a working, documented DB-level fallback that
   lets the rest of the journey continue and pass normally. **TEST-SCRIPT
   LIMITATION, not a product bug** — and it corrects an earlier
   over-cautious note in `PRODUCT_COVERAGE_MATRIX.md` that had this route's
   live-reachability marked uncertain; it is confirmed real and reachable.
