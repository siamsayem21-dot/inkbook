# InkBook — Real Studio Simulation Issues Log

Format per issue: ID / DATE / ROUND / PERSONA / WORKFLOW / SEVERITY / REPRODUCIBLE / EXPECTED / ACTUAL / REPRO STEPS / ROOT CAUSE / FILES / FIX / TEST / STATUS / LAUNCH BLOCKER / NOTES

## ISSUE-001
ID: ISSUE-001
DATE: 2026-08-24
ROUND: 1 (Studio Setup)
PERSONA: A — Studio Owner (found via automated real-browser interaction, applies to all personas)
WORKFLOW: Every form in the app (registration, login, password reset, all booking/consultation forms, most Owner admin forms, most Artist Portal forms)
SEVERITY: P2 (widespread accessibility/reliability defect; all flows remain functionally completable by sighted mouse/keyboard users, so not a launch-blocking P1, but real and systemic)
REPRODUCIBLE: Yes, 100%, confirmed via code inspection across the whole repo
EXPECTED: Every `<label>` is programmatically associated with its `<input>`/`<select>` (`htmlFor`/`id` pair), so screen readers announce the field name, and so browser/password-manager autofill and any accessible-name-based tooling can find fields reliably.
ACTUAL: `<label>` elements are plain text siblings of their inputs with no `htmlFor`/`id` pairing at all, in 24 of 25 files that use this pattern. Confirmed directly: a real Playwright script using `getByLabel('Studio Name')` against the live `/register` page (the same accessible-name lookup a screen reader performs) timed out after 30s because the field is not discoverable by label — this is not a theoretical accessibility nitpick, it's a real, provable "assistive tech cannot find this field" defect.
REPRO STEPS: 1. Open `/register` (or `/login`, `/book/[studio]/consult`, etc.) with a screen reader or any accessible-name-based automation. 2. Try to identify the "Studio Name" field by its label. 3. It fails — the label text exists visually but has no `for`/`id` link to the input.
ROOT CAUSE: Project-wide UI pattern: `<label className="label-xs ...">Field Name</label>` immediately followed by a sibling `<input>`/`<select>`, with `htmlFor`/`id` omitted every time this pattern was authored. Already known and partially fixed once before (`components/booking/ConsentForm.tsx`, flagged and fixed in the PR #9 CI cascade session, commit referenced in `DEFERRED_ISSUES.md`/memory) — that fix covered 6 of 7 labels in that one file but the pattern was never swept across the rest of the codebase.
FILES (24 files still affected, `grep -rl '<label'` vs `htmlFor` count mismatch):
  app/(auth)/register/page.tsx, app/(auth)/login/page.tsx, app/(auth)/reset-password/page.tsx,
  app/book/[studio]/consult/ConsultationForm.tsx, app/book/[studio]/custom/CustomRequestForm.tsx,
  app/book/[studio]/flash/[flashId]/book/FlashBookingForm.tsx, app/book/[studio]/login/EmailLoginForm.tsx,
  components/booking/BookingForm.tsx, components/booking/StandaloneConsentForm.tsx,
  components/booking/ConsentForm.tsx (1 remaining unlinked label out of 7),
  app/portal/[studio]/bookings/[bookingId]/review/ReviewForm.tsx,
  app/(artist)/artist/agreements/new/NewAgreementForm.tsx, app/(artist)/artist/consultations/[id]/ArtistConsultationDetail.tsx,
  app/(artist)/artist/flash/FlashClient.tsx, app/(artist)/artist/requests/[id]/QuoteForm.tsx,
  app/(owner)/owner/artists/new/page.tsx, app/(owner)/owner/artists/[artistId]/page.tsx,
  app/(owner)/owner/consultations/[id]/ConsultationDetail.tsx, app/(owner)/owner/knowledge/KnowledgeClient.tsx,
  app/(owner)/owner/requests/RequestsClient.tsx, app/(owner)/owner/requests/[id]/OwnerQuoteForm.tsx,
  app/(owner)/owner/settings/studio/StudioSettingsClient.tsx,
  components/owner/BlacklistManager.tsx, components/owner/ClientsTable.tsx, components/owner/ReviewsManager.tsx
FIX: Additive-only, zero visual/behavior change — add a unique `id` to each input/select and a matching `htmlFor` on its label. Fixing this session (batch 1, highest-traffic first-touch pages, blocks nothing else in the critical journey): `app/(auth)/register/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/reset-password/page.tsx`. Remaining 21 files recorded as a follow-up batch (same mechanical fix, safe, low priority relative to functional bugs) — not done in this session to keep blast radius proportionate to an autonomous QA pass touching many already-locked modules in one sitting.
TEST: Playwright `getByLabel(...)` resolving correctly for the 3 fixed pages; visual diff not expected (no className/layout change).
STATUS: IN PROGRESS (batch 1 fix applied this session; batch 2 deferred)
LAUNCH BLOCKER: No — all flows remain completable by sighted users; real compliance/accessibility risk worth scheduling deliberately.
NOTES: This finding generalizes and supersedes the narrower "ConsentForm.tsx has the same unlinked-label bug, unfixed" note from the 2026-08-02 PR #9 session memory — it's not isolated to ConsentForm, it's the dominant form-label pattern across the whole app.

## ISSUE-002
ID: ISSUE-002
DATE: 2026-08-24
ROUND: 1 (Studio Setup — Owner adds an artist)
PERSONA: A — Studio Owner
WORKFLOW: Adding an artist
SEVERITY: P3 (dead/orphaned code, NOT reachable via any real navigation link — confirmed by repo-wide grep — so no real studio owner can stumble into it; hygiene issue, not a functional regression)
REPRODUCIBLE: Yes, by direct URL navigation only
EXPECTED: Either the route doesn't exist, or it works.
ACTUAL: Two separate unreachable/broken leftovers found while verifying the real "add artist" flow:
  1. `app/(owner)/owner/artists/new/page.tsx` — a static `<form>` with zero `onSubmit`, zero state, zero wiring to the real `inviteArtist()` server action (`app/(owner)/owner/artists/actions.ts`). Clicking "Send invite" does nothing. Confirmed via grep that nothing in the app links to `/owner/artists/new` — the real, working "Add artist" UI is a modal inside `app/(owner)/owner/artists/ArtistsClient.tsx` which correctly calls `inviteArtist()`. This route is an orphaned early draft, not the live entry point.
  2. `app/dashboard/{artists,bookings,consent-forms}/**` (6 files, plus `_components/DashboardSidebar.tsx` and `_components/ConsentFormsTable.tsx`) — a second, entirely separate legacy dashboard tree, self-referential only (its own `artists/page.tsx` links to its own `artists/new`), not linked from anywhere in the real app. Distinct from `app/dashboard/page.tsx` itself, which is a legitimate, correct, live role-based redirect hub (`login` → `/dashboard` → routes to `/owner/dashboard` or `/artist/dashboard` or `/register` — verified correct, not a bug) — only its sibling subpages are dead.
ROOT CAUSE: Leftover early-prototype pages from before the real `(owner)`/`(artist)` route groups and `ArtistsClient.tsx` modal-based flows were built, never deleted.
FILES: app/(owner)/owner/artists/new/page.tsx; app/dashboard/artists/page.tsx; app/dashboard/bookings/page.tsx; app/dashboard/consent-forms/page.tsx; app/dashboard/consent-forms/_components/ConsentFormsTable.tsx; app/dashboard/_components/DashboardSidebar.tsx; app/dashboard/layout.tsx
FIX: Not applied — deleting ~7 unreachable files is a judgment call outside a QA pass's "smallest safe fix" scope, same category as the already-deferred `app/client-portal/**` prototype cleanup (DEFERRED_ISSUES.md #4). Recommend bundling both cleanups into one dedicated task.
TEST: N/A — not fixed.
STATUS: DEFERRED — NEEDS_SIAM (same "ok to delete?" judgment call as the existing client-portal dead-code item)
LAUNCH BLOCKER: No.
NOTES: The REAL add-artist flow (`ArtistsClient.tsx` → `inviteArtist()`) was verified separately and works — see Round 1 continuation below.

