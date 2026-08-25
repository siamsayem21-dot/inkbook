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

## [P0] Client Portal self-serve deposit/remainder payment is completely broken for every real studio right now (Stripe Connect fail-closed, no studio has connected yet)
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

**Status:** **BLOCKED_NEEDS_SIAM.** Not fixed. QA data cleaned up and
re-confirmed gone. Every other independent QA phase continued despite this
finding, per the mission's own "document + defer that piece + continue
everything else" rule.

## [P1] CONFIRMED (empirically, not just code-read): Owner-initiated "Generate Deposit Link" charges InkBook's platform account instead of the studio's own connected Stripe account
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

**Status:** **BLOCKED_NEEDS_SIAM** — confirmed real, not a code-read guess.
Needs Siam's decision on the fix (migrate `sendDepositRequest` to use the
same `getOrCreateDepositCheckoutSession` helper the Client Portal path uses,
so both paths route through Connect consistently — the obvious fix, but a
real-money Stripe-routing code change is exactly this mission's hard
safety gate, so it's not something to change autonomously even though the
fix itself looks straightforward). Not touched, not fixed, no code changed.

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
