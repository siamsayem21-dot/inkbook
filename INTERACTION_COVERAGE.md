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
(populated during Phase E execution)

## Phase F-N — Core Journeys (AI, Match, Quote, Stripe, Booking, Consent, Agreement, Remainder, Messages, Portfolio/Flash)
(populated during those phases)

## Phase O-R — Blacklist, Waitlist, Automations, Reviews
(populated during those phases)
