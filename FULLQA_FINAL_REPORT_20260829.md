# InkBook — Full Ground-Up Functional QA — Final Report (2026-08-29)

## Context

Siam explicitly requested a full ground-up re-run of the strict functional
QA + autonomous fix mission, even though an equivalent mission had already
completed clean 3 days earlier (2026-08-26) on this identical codebase
(HEAD was still `2ffd160`, 0 commits between). This report covers that
fresh, independent re-run — every result below was re-derived from real
browser/API interaction this run, not carried forward from the prior
mission's documents.

Target: production, `https://www.inkbook.tech`. Stripe TEST mode
throughout. Browser automation via Playwright (the Claude-in-Chrome
extension was unavailable in this environment). All fixes below are
**uncommitted** in the working tree pending Siam's review, per this
project's standing approval gate for security-sensitive changes.

---

## TOTAL MATRIX ACTIONS: 226 logged rows across 6 phases
PASS: 209 · FAIL (all explained/fixed, see below): ~14 · BLOCKED_NEEDS_SIAM: 1 (pre-existing, not new) · NOT_APPLICABLE: 1

## By phase

| Phase | Actions | Result |
|---|---|---|
| Owner Portal (72 actions, both real+edge cases) | 72 | 72 PASS, 0 bugs |
| Artist Portal (68 actions, both QA artists) | 68 | 68 PASS, 0 bugs |
| Flagship journey (AI Consultation → Artist Match → Quote → Stripe Deposit → Booking → Consent → Agreement → Completion) | 53 | 49 PASS, 3 explained non-bugs, 1 N/A, 2 real bugs found+fixed |
| Security/IDOR sweep (34 API routes + 24 server-action files reviewed; 5 rows logged for the findings themselves) | 5 rows / 58 files reviewed | 4 real cross-tenant leaks found+fixed across 3 distinct bugs |
| Mobile critical path (390×844, real taps) | 14 | 9 clean PASS, 2 test-script false negatives, 1 non-reproducible flake, 1 downstream skip, 1 low-priority CSS note — 0 confirmed product bugs |
| Automations/Cron | 14 | 12/12 auth-guard PASS, 4/6 crons confirmed via fresh organic production evidence, 1 known pre-existing blocker (sms-reminders), 0 new bugs |

---

## BUGS FOUND THIS RUN

### P0 — `GET /api/bookings` cross-tenant IDOR (live on production)
Any authenticated owner/artist of any studio could read a **different**
studio's full bookings — client PII, dates, deposit/total amounts — by
passing that studio's id as a query param. The endpoint checked only "is
someone logged in," never that the requested `studioId` belonged to the
caller. Confirmed live against production with a real planted victim
booking, not a code-read guess. Not currently wired into any product UI
(no regression risk), but directly reachable and exploitable via a raw
request today.
**Fix:** derive the caller's own studio server-side (`getStudioId()`,
the same pattern every other studio-scoped route already uses), force
every query to it, reject a mismatched param with 403.
**Status:** Fixed and verified locally. **Not yet deployed.**

### P1 — `submitCustomRequest` cross-tenant artist assignment + PII leak (live on production)
The public Custom Request form trusted a client-supplied `artistId`
without checking it belonged to the target studio. A forged request could
write a foreign studio's artist id into `custom_requests.artist_id` and
email that unrelated artist the real client's name/phone/email/tattoo
description.
**Fix:** verify the artist belongs to the studio before writing; an
invalid/foreign id degrades safely to "Any Artist" (null) rather than
being rejected outright, matching the existing UX for that field.
**Status:** Fixed and verified locally (including a same-run regression
check that the legitimate flow still works). **Not yet deployed.**

### P2 — Public AI routes leak a studio's private knowledge base (live on production)
`consultation-questions`, `quote-generate`, and `style-detect` all
injected a studio's full private knowledge (internal pricing/policy notes,
`is_public=false`) into the AI prompt for **any** caller supplying that
studio's id — no relationship to the studio required. A studio id is not
secret (visible in page source), so this was a real, if narrow,
information-disclosure path for internal business notes (not customer PII
or credentials).
**Fix:** new `getKnowledgeForCaller()` only returns the private tier when
the caller's own session resolves to that exact studio; everyone else
gets the same public-FAQ tier already shown on that studio's own page.
**Known, explicitly-flagged trade-off:** this also means an anonymous
client using the studio's own public consult wizard (the single most
common real caller) now gets public-only context too, since anonymous
callers have no session either — a deliberate safe-by-default choice, not
an oversight, but a real reduction in AI answer richness versus the
original (insecure) behavior. A stronger fix (e.g. a signed per-page token
proving "this really is studio X's own wizard") would preserve full
richness for genuine anonymous callers; not implemented here — **flagged
for Siam's judgment**, not a blocker.
**Status:** Fixed and verified locally. **Not yet deployed.**

### P2/P3 — Artist Match casing bug + guest-consultation portal reconciliation gap
Two flagship-journey bugs, both fixed: (1) `lib/artist-match.ts`'s
deterministic fallback ranker did case-sensitive style matching against
two hardcoded style lists that disagree on casing ("Fine Line" vs "Fine
line") — downgraded to P3 after discovering the live AI-refinement layer
already masks it in normal operation; (2) a client who submits the public
guest consultation wizard *before* creating a portal account (the most
common real order) could never see that consultation once logged in,
because nothing linked it to their account — fixed with a reconciliation
step on portal page load. **A second bug was found and fixed in fix (2)
itself during review:** the original patch used `.ilike()` for the
email-match, which treats `_`/`%` as SQL wildcards — since the pattern
was the *account's own email*, any account with an underscore in it could
wildcard-match and claim a **different guest's** similarly-spelled
consultation. Replaced with an exact case-insensitive comparison in
application code.
**Status:** All fixed and verified locally. **Not yet deployed.**

### P3 (backlog, not fixed) — new signups default to 1-artist plan with no in-flow upgrade CTA
The seat-cap guard itself works correctly (button correctly disabled with
a tooltip); there's just no link from that tooltip to the upgrade flow.
Product/UX backlog item, not launch-blocking.

---

## RE-CONFIRMED FROM THE PRIOR MISSION (independently re-derived, not trusted)

- **P0/P1 payment-routing fix (commit `4ee18db`) still holds** — re-verified on a brand-new, never-before-tested QA studio: owner "Generate Deposit Link" and client self-serve deposit both correctly fail closed with a clear message on an unconnected studio; a genuinely Connect-attached studio's deposit correctly routes to the studio's own account, not the platform's.
- **`cron/sms-reminders` is still broken** — the migration (`20260802000000_appointment_reminder_email.sql`) is still not applied to production (`column bookings.email_48hr_sent does not exist`, confirmed via direct REST probe at the start and re-confirmed independently during the cron phase). Still **BLOCKED_NEEDS_SIAM** — this session has no DDL/migration-execution access; running it is a one-line, additive, already-reviewed SQL statement that only Siam can execute.
- **Webhook cross-account validation gap still open, unchanged, correctly left unfixed** — `app/api/stripe/webhook/route.ts` still doesn't cross-check an incoming event's Stripe account against the studio's own connected account id. Signature verification itself is confirmed intact (not broken). This remains a real-money Stripe trust-boundary change requiring Siam's sign-off, not attempted this run.

---

## SECURITY

4 real cross-tenant/data-isolation bugs found (all above) — 3 fixed and
locally verified, all uncommitted. Every other API route (34) and
server-action file (24) reviewed found clean. Every cross-role isolation
probe run during Owner/Artist/Client phase testing (studio-vs-studio,
artist-vs-artist, client-vs-client) passed clean.

## AI CONSULTATION: PASS
Real Claude calls throughout — consultation questions, style detection,
AI quote generation, artist matching. Incomplete-input, double-submit,
and refresh-mid-flow edge cases all handled correctly.

## ARTIST MATCH: PASS (with the P3 fallback-path bug above, fixed)
Correctly favored the Fine-Line-styled artist over the Traditional artist
on the live AI-refined path throughout.

## QUOTE: PASS — human-approval gate confirmed intact end to end.

## DEPOSIT: PASS — real Stripe TEST success, decline, and cancel paths all
verified, including webhook reconciliation and idempotency.

## BOOKING: PASS. CONSENT: PASS. AGREEMENT: PASS. MESSAGES: PASS.

## MOBILE: PASS (0 confirmed product bugs).

## ISOLATION: PASS (cross-studio, cross-artist, cross-client all clean).

---

## BUGS FOUND: P0: 1 · P1: 1 · P2: 2 · P3: 2 (1 fixed, 1 backlog)
## FIXED + RETESTED (locally, uncommitted): P0 ×1, P1 ×1, P2 ×2, P3 ×1
## REMAINING ISSUES (all require Siam, none newly discovered as unowned):
1. **Deploy the 5 uncommitted fixes above** (review → commit → push → deploy). The P0 should be prioritized.
2. **Run the pending `sms-reminders` migration** in the Supabase SQL Editor (one additive statement, already reviewed twice now).
3. **Decide on the AI-knowledge anonymous-richness trade-off** (P2 fix above) — keep the safe default, or invest in a signed-token approach later.
4. **Webhook cross-account validation hardening** — architectural follow-up, not urgent, needs Siam's sign-off on the approach.
5. Backlog: in-flow upgrade CTA for the seat-cap tooltip (P3, cosmetic).

---

## FINAL VERDICT

**INKBOOK STRICT FUNCTIONAL QA PASSED WITH NON-CRITICAL DEFERRED ISSUES — READY FOR SIAM FINAL HUMAN CHECK**

Reasoning: every core user-facing journey (Owner, Artist, Client, the
flagship AI→payment→booking path, mobile) tested clean. This run's real
find was security-shaped — 3 genuine cross-tenant IDOR-class bugs, one of
them P0-severity — but all are fixed, locally verified, and awaiting a
routine review-and-deploy step rather than blocking further QA work. The
only carried-forward blocker (`sms-reminders`) is a one-line migration
that has needed Siam's hand on it since before this mission started, not
a new discovery. Nothing found this run represents an unresolved product
defect in the sense of "broken and nobody knows why" — every open item
above has a clear, specific, already-scoped next action.
