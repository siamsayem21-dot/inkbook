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

## [P1] Owner-initiated "Generate Deposit Link" does not appear to route through Stripe Connect at all — needs Siam verification, not autonomously touched
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

**Not independently runtime-confirmed with a real payment** — deliberately
not attempted, since completing a real Stripe Connect payment specifically
to prove a money-routing bug is itself a real-money-adjacent action outside
this mission's safe-autonomous-action boundary. Flagging with the exact code
evidence above instead of asserting certainty from a code read alone.

**Status:** **BLOCKED_NEEDS_SIAM** — needs either Siam's own verification or
explicit authorization for a scoped, real (Connect test-mode) payment
specifically targeting this exact code path to confirm/deny definitively.
Not touched, not fixed, no code changed.

---

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

**Flaky unit test (unrelated to this mission's changes).**
`tests/unit/sentry-config.test.ts` failed once during a pre-commit hook run
("loads without throwing and produces a valid Next.js config object",
~2.7s — likely a cold-import timing hiccup under concurrent load). Reran the
full suite twice immediately after: 601/601 clean both times. Classified
**FLAKY** — not touched, not a product bug.
