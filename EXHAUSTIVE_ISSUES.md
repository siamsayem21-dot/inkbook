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
