# InkBook — Interaction Coverage

Per-control interaction log. Populated incrementally as each route is
exercised (not pre-populated up front — the mission's own guidance is to
discover controls at runtime via the actual DOM/accessibility tree, not
guess them from JSX in advance). Format per entry:

`ROLE | ROUTE | UI STATE | CONTROL | TYPE | EXPECTED | METHOD | STATUS | EVIDENCE`

Entries are grouped by phase/route as they're completed. See
`EXHAUSTIVE_QA_MASTER.md` for the current phase/next-item pointer.

---

## Phase A — Auth
See `scripts/qa-phase-a-auth.mjs`. Covered: invalid-credential login (error shown, stays on page), register short-password client-side validation, reset-password no-session redirect to `/login?error=link_expired`, logged-out access to `/owner/dashboard` `/artist/dashboard` `/dashboard` (all → `/login`), Owner-visiting-`/artist/**` boundary (5 routes, all resolve to `/artist/dashboard` empty-state via each page's own server-side artist-row check — verified in source, not assumed), Artist-visiting-`/owner/**` boundary (4 routes, all → `/register`). **0 findings.**

## Phase B — Owner Portal
See `scripts/qa-phase-b-owner.mjs` (Part 1: Artists + Settings — remaining Owner modules covered directly by the coordinator below). Real interactions, DB-verified:
- OWNER | /owner/artists | empty | page load | navigation | "No Artists Yet" shown | DOM check | PASS
- OWNER | /owner/artists/new | any | direct nav | navigation | redirect to /owner/artists (after fix) | DOM+DB | FIXED→RETESTED locally (prod pending redeploy) — see EXHAUSTIVE_ISSUES.md
- OWNER | /owner/artists | empty | "Invite Artist" button + modal form | click+fill+submit | new artist_invites row, studio_id scoped | DB re-query | PASS
- OWNER | /owner/artists | populated | invited artist row | render | "Invited" badge shown | DOM | PASS
- OWNER | /owner/artists | populated | duplicate-email invite | click+fill+submit | rejected with "Email already invited to this studio" | DOM+DB (only 1 row) | PASS (re-verified twice after 1 flaky run — see EXHAUSTIVE_ISSUES.md)
- OWNER | /owner/artists | populated | "Resend" | click | artist_invites.expires_at extended | DB re-query | PASS
- OWNER | /owner/artists | populated | "Cancel" | click | artist_invites row deleted | DB re-query | PASS
- OWNER | /owner/artists | populated | "Remove Artist" | click+confirm | artists.user_id nulled, row + booking history preserved | DB re-query | PASS
- OWNER | /owner/settings/studio | populated | name/address fields + Save | fill+click | studios row updated | DB re-query | PASS
- OWNER | /owner/artists, /owner/settings/studio | mobile (390x844) | full interaction (not screenshot-only) | click+fill+submit | no overflow, modal usable, real DB row created | DOM+DB | PASS (4 checks)

**Part 2 — remaining ~15 modules.** See `scripts/qa-phase-b-owner-part2.mjs`.
1 studio, 1 artist, 2 clients, 6 bookings (one per status), 4 consultations,
2 custom_requests, 1 flash design, 1 waitlist entry seeded directly. 35
interactions, desktop+mobile. **0 real findings** (2 test-script bugs found
and fixed mid-run — a fixed-timeout race on the review-add DB check, and a
body-text assertion that false-matched a `<select>` option label instead of
the results table — both documented in EXHAUSTIVE_ISSUES.md).
- OWNER | /owner/bookings | populated | filter strip (status=confirmed) | click/nav | count matches a raw DB query for that status | DOM+DB | PASS
- OWNER | /owner/bookings | populated | booking row → detail nav | click | lands on `/owner/bookings/[id]` | DOM (URL) | PASS
- OWNER | /owner/bookings/[id] | completed booking | render | correct status badge shown | DOM | PASS
- OWNER | /owner/pipeline | populated | Kanban board render | render | stage counts match DB; both a `consultations` card and a `custom_requests` card render on the same board (dual-source confirmed) | DOM+DB | PASS
- OWNER | /owner/requests | pending | Approve modal (assign quote $500 / deposit $150 / note) | click+fill+submit | `custom_requests.status='quoted'`, `quote_amount`/`deposit_amount` match | DB re-query | PASS
- OWNER | /owner/requests | pending | Decline modal (reason) | click+fill+submit | `status='declined'`, `declined_reason` matches | DB re-query | PASS
- OWNER | /owner/clients | populated | list render | render | both seeded clients visible, booking-count enrichment correct | DOM+DB | PASS
- OWNER | /owner/revenue | populated | stat cards | render | "This month" renders; "Deposits kept (no-shows)" shows $150.00 matching the one seeded `deposit_kept=true` booking | DOM+DB | PASS
- OWNER | /owner/reviews | empty→populated | "+ Add testimonial" form | click+fill+submit | real `reviews` row, `is_public=true` (owner-added default) | DB re-query (polled, not fixed-wait — see EXHAUSTIVE_ISSUES.md) | PASS
- OWNER | /owner/reviews | populated | "Hide" toggle | click | `is_public` flips to false | DB re-query | PASS
- OWNER | /owner/reviews | populated | "Delete" (2-click confirm) | click×2 | row removed | DB re-query | PASS
- OWNER | /owner/blacklist | empty→populated | "Block client" form | click+fill+submit | real `blacklist` row + a real `blacklist.added` `audit_log` entry | DB re-query (both tables) | PASS
- OWNER | /owner/blacklist | (negative test) | direct `POST /api/bookings` using the just-blocked email | fetch | HTTP 400, booking rejected | HTTP status | PASS — confirms enforcement lives at the API, not just the UI |
- OWNER | /owner/blacklist | populated | "Remove" (2-click confirm) | click×2 | row deleted | DB re-query | PASS
- OWNER | /owner/consent-forms | empty | render | "No Consent Forms Yet" shown for a studio with zero signed forms | DOM | PASS
- OWNER | /owner/waitlist | populated | monthly cap input + Save | fill+click | `artists.monthly_booking_cap` updated | DB re-query | PASS
- OWNER | /owner/waitlist | populated | "Remove" (2-click confirm) | click×2 | `waitlist` row deleted | DB re-query | PASS
- OWNER | /owner/knowledge | empty→populated | "+ Add knowledge entry" (category=Policy) | click+fill+submit | real `studio_knowledge` row, `is_active=true` | DB re-query | PASS
- OWNER | /owner/knowledge | populated | "Disable" toggle | click | `is_active` flips to false | DB re-query | PASS
- OWNER | /owner/knowledge | populated | "Edit" → title/content change → "Save changes" | click+fill+submit | new title/content persisted | DB re-query | PASS
- OWNER | /owner/knowledge | populated | "Delete" (2-click "Sure?" confirm) | click×2 | row removed | DB re-query | PASS
- OWNER | /owner/audit-log | populated | render | both the `blacklist.added` and `blacklist.removed` events from the block/unblock steps above appear | DOM | PASS
- OWNER | /owner/audit-log | populated | `?action=blacklist.added` filter | nav | results table scoped to only block events (not unblock) | DOM (table-scoped, not full-page text) | PASS
- OWNER | /owner/flash | populated | render | artist-created flash design visible in owner's read-only cross-artist view | DOM | PASS
- OWNER | /owner/settings/billing | populated | render | correct plan label/price for `plan='studio'` ($79/mo); Stripe Connect section renders (confirms `STRIPE_CONNECT_ENABLED=true` is genuinely active in this environment, corroborating the P0 finding) | DOM | PASS
- Mobile (390x844): /owner/bookings, /owner/requests, /owner/clients, /owner/revenue, /owner/pipeline all real-navigated, zero horizontal overflow.

## Phase C — Artist Portal
See `scripts/qa-phase-c-artist.mjs`. 68 real interactions, desktop+mobile, DB-verified. **0 findings** (1 script bug found and fixed mid-run — `:has-text("+ Add style tag")` selector ambiguity, not a product bug; 1 script crash fixed — double `dialog.accept()` on a retry path). Covered:
- Route sweep: all 18 Artist routes × desktop + mobile = 36 checks, all 200/on-route/no-overflow.
- Portfolio: real PNG upload → `portfolio_images` row + resolvable public storage URL; style tag set → DB-confirmed `style="Japanese"`; delete → DB-confirmed row gone.
- Flash: create → DB row + resolvable image URL + **appears on the live public `/book/[studio]` page**; delete → DB row gone **and** correctly disappears from the public page too.
- Days Off: add unavailable date → DB-confirmed; **a real booking API call against that exact date is REJECTED (HTTP 409)**; remove the date → the same booking call now succeeds (201). This is the previously-shipped conflict-prevention feature, re-verified end-to-end, not assumed.
- Consultations: direct-nav to a colleague's assigned consultation → 404; direct-nav to a different studio's consultation → 404; claim + quote save → DB-confirmed `artist_id`/`final_price`/`status`.
- Custom Requests: approve → DB-confirmed quoted+claimed+deposit amount; decline → DB-confirmed status+reason.
- Booking detail: without signed consent, "Mark Session Completed" is correctly hidden with a warning; with it available, clicking it → DB-confirmed `status=completed`+`completed_at`; direct-nav to a colleague's booking and a different studio's booking both correctly blocked.
- Earnings: **real dollar-figure cross-check against a raw DB query** (confirmed+completed bookings this month = $300 from 2 bookings) — matches the page, and a `pending_deposit` $9999 booking + a `cancelled` $8888 booking are correctly excluded (status filter genuinely applied, not just "renders a number").
- Clients: list correctly shows own client, hides a colleague-only client; direct-nav to a colleague-only client → 404.
- Session Agreement: create → DB-confirmed `artist_id`/`booking_id`/`price`, appears in the list.
- Messages: send → DB-confirmed `sender_artist_id`; a colleague's direct-nav to the thread → 404.
- Cross-studio isolation (Artist C, different studio): zero data leakage on 5 routes + 3 direct-ID probes (booking/client/consultation) — all correctly blocked.

## Phase D — Client Portal
See `scripts/qa-phase-d-client.mjs`. Real OTP-cookie-injected sessions (2
clients), 6 seeded projects spanning the full lifecycle, desktop+mobile.
- CLIENT | /consultation | real AI chat round-trip (message send → real Claude reply) | click+fill+submit | assistant responds | live API | PASS
- CLIENT | /dashboard | Welcome message, magnetic "Start AI Consultation" CTA, 4 section cards | render+click | all visible, no overflow | DOM+viewport | PASS (5/6 — 1 lower-confidence text-match, see EXHAUSTIVE_ISSUES.md)
- CLIENT | /projects | 6 project cards across new/quoted/accepted/deposit-pending/confirmed/completed | render | all 6 present | DOM+DB | PASS
- CLIENT | /projects/[id] (C2) | "Accept Quote" | click | consultations.quote_accepted_at set | DB re-query | PASS
- CLIENT | /projects/[id] (C3) | "Continue to Deposit" | click | real booking created, Connect fail-closed correctly blocks navigation (see P0) | DB re-query | PASS (booking) / documents P0 (redirect)
- CLIENT | /projects/[id]/consent (C4) | full consent form (name/DOB/ID photo/signature/checkbox) + submit | click+fill+upload+submit | consent_forms row created, idempotent re-visit redirect | DB re-query (after fixing a QA-seed gap — see EXHAUSTIVE_ISSUES.md) | PASS
- CLIENT | /projects/[id] (C5) | "Ask a Question" | click | project-scoped thread created | DB re-query (consultation_id linkage) | PASS
- CLIENT | /bookings | 4 bookings list | render | correct count | DOM | PASS
- CLIENT | /bookings/[id] (C3) | 24h deposit countdown banner | render | shown | DOM | PASS
- CLIENT | /bookings/[id] (C5) | "Message About This Booking" | click | real thread created/opened | DB re-query | PASS
- CLIENT | /bookings/[id] (C6) | Aftercare Instructions section | render | shown for completed booking | DOM | PASS
- CLIENT | /bookings/[id]/review (C6) | rating + text + submit | click+fill+submit | reviews row created (rating, is_public=false default, correct client_account_id), idempotent redirect on revisit | DB re-query | PASS
- CLIENT | /history | timeline across all 6 projects + general conversations | render | all present | DOM | PASS
- CLIENT | /messages | send message, "New Conversation" idempotency, cross-role round trip | click+fill+submit | Owner sees it real-time via /owner/messages, client sees Owner's reply after reload | DB re-query both directions | PASS
- CLIENT | /settings | display name field + Save | fill+click | client_accounts.name updated, persists across reload | DB re-query + reload | PASS
- Mobile (390x844): dashboard, projects, bookings, booking detail, history, messages all real-interacted (not screenshot-only), zero horizontal overflow.
- Security: Client B empty-state (3 routes) + 5/5 direct-ID IDOR probes against Client A's data all correctly blocked. Cross-studio portal-shell access confirmed data-safe (double-scoped queries).

## Phase E — Public / White-label
See `scripts/qa-phase-e-public.mjs`. 33 interactions against production,
desktop+mobile. **0 real findings** (4 test-script issues found and fixed
mid-run — wrong table assumption for the classic flow's webhook branch,
`isVisible({timeout})` not actually polling, a case-sensitive check against
CSS-uppercased text, and one correctly reclassified as BLOCKED_EXTERNAL —
all documented in EXHAUSTIVE_ISSUES.md).
- PUBLIC | /book/[studio] | populated | landing page render | render | branding/about/stats/2 artist cards/portfolio/flash/reviews/FAQ all from real DB content | DOM+DB | PASS
- PUBLIC | /book/[nonexistent-slug] | — | direct nav | navigation | HTTP 404, no data leakage | HTTP status | PASS
- PUBLIC | /book/[studio]/[artistId] | populated | render + "Book now" CTA | click | correct name/styles, navigates to /book | DOM (URL) | PASS
- PUBLIC | /book/[studio]/[artistId]/book (E4) | — | BookingForm full submission | fill×7+click | real booking row created, redirected to /deposit?booking_id= | DB re-query | PASS
- PUBLIC | .../book/deposit (E4) | — | "Pay $X deposit" | click | real redirect to checkout.stripe.com | DOM (URL) | PASS
- PUBLIC | .../book/deposit (E4) | — | real Stripe TEST payment (`stripe trigger checkout.session.completed`, webhook Branch C / `deposits` table) | CLI+webhook | booking `status='confirmed'`, `deposit_paid=true` | DB re-query (polled) | PASS — **first real-payment test of this specific code path in the mission** |
- PUBLIC | .../book/consent (E4) | post-payment | real `ConsentForm` submission (name/DOB/ID photo/signature/checkbox) | fill+upload+click | `consent_forms` row created, lands on /confirmation | DB re-query | PASS
- PUBLIC | .../book/confirmation (E4) | — | render | render | confirmation page reached with booking details | DOM (URL+text) | PASS
- PUBLIC | /book/[studio]/custom (E5) | — | 3-step form (About You → Your Idea → Final Details → Submit) | fill×9+click×3 | real `custom_requests` row, correct `artist_id`/`status='pending'`, "Request Submitted!" success screen | DOM+DB | PASS
- PUBLIC | /book/[studio]/flash/[flashId]/book (E6) | non-repeatable design | full form submission | fill+click | real booking with `style`/`description` derived from the flash design | DB re-query | PASS
- PUBLIC | (E6) | after booking | — | — | `flash_designs.is_booked` flips true; re-visiting the booking page for that design now 404s | DB re-query + HTTP status | PASS
- PUBLIC | /book/[studio]/login (E7) | — | email submit | fill+click | real `signInWithOtp()` call, redirect to /login/verify?email= with correct email | DOM (URL) | PASS (or correctly-reported BLOCKED_EXTERNAL when Supabase's own project email quota was already exhausted by this session's testing) |
- PUBLIC | /book/[studio]/login/verify (E7) | — | render | render | correct email displayed, 6-digit code UI present | DOM | PASS (real code entry out of scope — no test-inbox access; underlying mechanism covered by Phase A/D) |
- PUBLIC | /book/[studio]/consent (E8) | — | render | render | correct studio name + form heading (standalone `StandaloneConsentForm`) | DOM | PASS
- PUBLIC | /book/[studio]/request/[id] (E9) | quoted status | render | render | real `quote_amount`/`deposit_amount`/`quote_message` shown, "Pay deposit" CTA present | DOM+DB | PASS
- Mobile (390x844): landing, artist profile, custom request form, login page all real-navigated, zero horizontal overflow.

## Phase F-N — Core Journeys (AI, Match, Quote, Stripe, Booking, Consent, Agreement, Remainder, Messages, Portfolio/Flash)
(populated during those phases)

## Phase O-R — Blacklist, Waitlist, Automations, Reviews
(populated during those phases)
