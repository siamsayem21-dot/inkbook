# InkBook — Controlled Beta: Studio #1 Onboarding

**Status: NOT YET STARTED.** No real studio has been selected or onboarded yet. This file is a structured checklist with empty fields — nothing below is fabricated. Fill in the "Studio Identity" section and start checking boxes only once a real studio actually begins onboarding.

**Engineering readiness going in:** V1's 8-phase completion mission is done, the Real Studio Simulation + two focused QA passes (2026-08-24/25) verified the full critical journey end-to-end with real data (Stripe TEST payments, real AI calls, real webhooks), and the working tree is clean at commit `872c98d`. This file does not re-verify any of that — see `REAL_STUDIO_QA.md`, `REAL_STUDIO_ISSUES.md`, `MASTER_PLAN.md`, and `DEFERRED_ISSUES.md` for the evidence. This file is purely about the *operational* act of bringing one real studio onto the platform safely.

---

## Information needed from Siam before onboarding can start

Nothing in this list should be guessed or invented. Leave blank until Siam provides it.

| Field | Value |
|---|---|
| Studio legal/business name | _(not yet provided)_ |
| Desired public studio name (as clients will see it) | _(not yet provided)_ |
| Desired subdomain slug (`inkbook.tech/book/<slug>`) | _(not yet provided)_ |
| Studio address | _(not yet provided)_ |
| Studio state (drives consent-form state template) | _(not yet provided)_ |
| Timezone | _(not yet provided)_ |
| Contact phone | _(not yet provided)_ |
| Contact email | _(not yet provided)_ |
| Logo file | _(not yet provided)_ |
| Brand colors (primary/secondary) | _(not yet provided)_ |
| Pricing plan (Solo $49 / Studio $79 / Pro $129) | _(not yet decided)_ |
| Deposit amount/policy the studio wants | _(not yet provided)_ |
| Cancellation/no-show policy text | _(not yet provided)_ |
| Number of artists at launch | _(not yet provided)_ |
| Artist names + emails (for invites) | _(not yet provided)_ |
| Owner's real email (for the real account) | _(not yet provided)_ |
| Real Stripe account for the studio (Stripe Connect onboarding) | _(not yet started)_ |
| Go-live date target | _(not yet provided)_ |

**Do not populate the checklists below with placeholder/fake data.** Leave items unchecked until the real studio actually performs them.

---

## Pre-existing, already-known items relevant to Studio #1 (context, not new work)

Carried forward from `DEFERRED_ISSUES.md` / `REAL_STUDIO_ISSUES.md` — Studio #1 will hit these in normal use. Not blockers, but the studio/owner should know about them going in:

- **Consent form legal text is generic, not state-specific** (`DEFERRED_ISSUES.md` #1). If Studio #1's state has stricter minor-consent rules than the generic guardian-consent flow encodes, flag it before go-live — this needs a verified legal source from Siam, not a guess.
- **Deposit/no-show auto-cancel latency is up to ~48h**, not the 24h CLAUDE.md figure states (`DEFERRED_ISSUES.md` #7, Vercel Hobby plan cron cadence — already decided: keep Hobby for beta).
- **No wildcard subdomain** — Studio #1's public page will be `inkbook.tech/book/<slug>`, not `<slug>.inkbook.tech` (`DEFERRED_ISSUES.md` #2, infra decision deferred).
- **Stripe Connect is live but Studio #1 hasn't connected an account yet** — until they do, deposits/remainder route through InkBook's own platform Stripe account (subscription-only revenue model either way; no % fee is ever taken from client payments regardless of connection state).
- **A few orphaned/dead admin pages exist but are unreachable** (`REAL_STUDIO_ISSUES.md` ISSUE-002) — not a risk to Studio #1's real usage, listed only so nobody is surprised if they're spotted during a code review.
- Two of the earlier session's public-form fixes (`ISSUE-001`, unlinked `<label>`/`<input>` pairs) are now fully resolved — no action needed, noted for completeness.

---

## TASK 1 — Beta Studio Onboarding Checklist

### STUDIO
- [ ] Studio name set
- [ ] Logo uploaded
- [ ] Brand colors (primary/secondary) set
- [ ] Address entered
- [ ] Timezone set correctly
- [ ] Contact phone/email entered
- [ ] Cancellation/no-show policy text entered (Knowledge base or studio settings, whichever the studio wants public)
- [ ] Deposit amount/policy configured and confirmed correct on the public booking page
- [ ] Subdomain slug confirmed working at `inkbook.tech/book/<slug>`

### OWNER
- [ ] Owner account created (real email, not a test account)
- [ ] Owner login verified (password login works, session persists across refresh)
- [ ] Owner can reach every sidebar section without error (Dashboard, Consultations, Pipeline, Artists, Bookings, Requests, Messages, Flash, Clients, Revenue, Reviews, Blacklist, Consent Forms, Waitlist, Audit Log, Knowledge, Settings)
- [ ] Owner permissions verified — owner-only actions (cancel booking, remove artist, billing) behave correctly; nothing artist-only leaks into the owner view incorrectly

### ARTISTS
- [ ] Each artist invited via the real Owner → Artists → Invite flow
- [ ] Each artist accepted their invite and can log in
- [ ] Each artist's profile (name, bio) filled in
- [ ] Each artist's accepted styles set (drives AI Artist Match)
- [ ] Each artist's weekly availability set
- [ ] Each artist has at least a minimal portfolio uploaded
- [ ] Flash designs uploaded where the studio wants self-serve flash booking

### PUBLIC EXPERIENCE
- [ ] Public studio page (`/book/<slug>`) loads correctly with real studio branding
- [ ] Artists tab shows the real roster correctly
- [ ] Portfolio images render correctly (no broken images, no cross-studio bleed)
- [ ] Flash tab (if used) shows correct designs/prices
- [ ] Policies/FAQ content is the studio's real policy, not placeholder copy
- [ ] "Start AI Consultation" CTA is visible and reachable
- [ ] Mobile view checked on a real phone (not just emulation) — no overflow, CTA reachable, forms usable

### BOOKING OPERATIONS (real end-to-end, with the studio's own first real or friends-and-family test client)
- [ ] Consultation: a real client can complete the AI consultation wizard
- [ ] Artist Match: the studio sees a sensible "Recommended" artist for that consultation (requires artists to have real `styles` set — see Artists checklist)
- [ ] Quote: owner/artist can generate and save a quote the client will actually see
- [ ] Deposit: a real Stripe payment (real card, real money) completes and reconciles correctly — this is the first point real money moves, treat it as the single most important checklist item
- [ ] Booking: the paid deposit correctly produces a booking with the right artist/date/time
- [ ] Consent: the client can sign the consent form and the studio sees it as signed
- [ ] Appointment: owner and artist both see the same, correct appointment info (no cross-view drift)
- [ ] Agreement: session agreement can be created for a real session if the studio uses this feature
- [ ] Completion: artist can mark a session completed after it happens
- [ ] Review: client can be prompted for / can leave a review, owner can see and approve it

---

## TASK 4 — Beta Studio #1: 7-Day Daily Observation Plan

Run this for the first 7 real operating days after go-live. One pass per day is enough unless something looks wrong — then check more often that day.

### Day-by-day tracking table

| Day | Date | Owner OK? | Artist OK? | Client OK? | Mobile OK? | Issues found (link to BETA_ISSUES.md IDs) |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |

### What to check each day

**Owner:**
- [ ] Dashboard shows correct, current numbers (not stale)
- [ ] New consultations appear and are reviewable
- [ ] Quotes can be created/sent without friction
- [ ] Bookings list matches what actually happened that day
- [ ] Client management (CRM) reflects real clients correctly
- [ ] Artist schedules look right from the owner's view
- [ ] Payment/deposit status shown is accurate (no "pending" that's actually paid, or vice versa)
- [ ] Consent status shown is accurate
- [ ] Messages (if used) deliver and display correctly

**Artist:**
- [ ] Daily dashboard shows today's real appointments
- [ ] Can review a real consultation assigned to them
- [ ] Can create/adjust a quote if that's part of their workflow
- [ ] Schedule/availability reflects reality
- [ ] Booking detail matches the owner's view of the same booking (no drift)
- [ ] Client info visible is correct and current
- [ ] Can create a session agreement if used
- [ ] Portfolio/Flash still display correctly (no regression from new uploads)
- [ ] Earnings/messages reflect real activity

**Client (observe via the studio's actual clients, or a controlled friends-and-family test if no real client has been through yet):**
- [ ] Public studio page is the first real impression — confirm it looks right
- [ ] Consultation flow completes without confusion
- [ ] Artist Match recommendation looks sensible to the studio
- [ ] Quote is clear and the client understood what they were agreeing to
- [ ] Deposit payment succeeded and the client got a clear confirmation
- [ ] Booking details are correct from the client's own view (portal or confirmation page)
- [ ] Client portal (if the client logged in) shows correct booking/history
- [ ] Consent form was understandable and didn't block a real client unnecessarily
- [ ] Appointment reminders (SMS/email) actually arrived — this is a real-world check the QA sim couldn't fully do, since it needs a real phone/inbox
- [ ] Agreement (if used) was clear to the client
- [ ] Completion/aftercare message arrived
- [ ] Review request arrived and the flow to leave one worked

**Also watch for, every day:**
- [ ] Mobile usability problems (cramped forms, unreachable buttons, layout breaking)
- [ ] Signs of confusion (the studio asking "why does it say X" or "where do I find Y")
- [ ] Repeated actions (owner/artist clicking the same thing multiple times because it wasn't clear it worked)
- [ ] Stale or wrong status anywhere (a booking that says "pending" when it's actually confirmed, etc.)
- [ ] Missing notifications (SMS/email that should have fired but didn't)
- [ ] Payment inconsistencies (Stripe says paid but InkBook doesn't, or vice versa)
- [ ] Cross-role data mismatch (owner and artist seeing different info for the same booking)
- [ ] Any real-world workflow friction — something technically "works" but isn't how a real studio actually operates day to day

Every real finding goes into `BETA_ISSUES.md` using its template — see Task 2 below.

---

## TASK 5 — Beta Exit Criteria (when is Studio #1 "STABLE"?)

Studio #1 is STABLE, and Studio #2/#3 onboarding can be recommended, only when **all** of the following are true:

- [ ] No unresolved P0 issues
- [ ] No unresolved P1 issues
- [ ] The core client journey (consultation → artist match → quote → deposit → booking → consent → appointment → agreement → completion → review) completes reliably for real clients, not just in QA
- [ ] The owner can perform their normal daily work without needing engineering help
- [ ] The artist(s) can perform their normal daily work without needing engineering help
- [ ] A real client can complete the critical journey on mobile, not just desktop
- [ ] Booking/payment/consent/status stay consistent across owner, artist, and client views — no observed drift during the 7-day window
- [ ] Every real issue found during the 7 days is logged in `BETA_ISSUES.md`, reproducible, and either fixed-and-retested or explicitly and knowingly deferred
- [ ] All applied fixes have been retested and confirmed working, not just shipped

**Current state: not yet applicable — Studio #1 has not started onboarding.**

**Once STABLE is reached:** recommend to Siam that Studio #2 and Studio #3 onboarding begin, following the same checklist structure (a fresh copy of this file per studio, or a shared multi-studio tracker — Siam's call at that point).
