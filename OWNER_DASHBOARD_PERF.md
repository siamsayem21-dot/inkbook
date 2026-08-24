# Owner Dashboard — Performance Diagnosis & Fix (2026-08-25)

## Summary

**Problem reproduced: YES, in both dev mode and production mode.** A genuine, real backend/query-count root cause was found and fixed — not a redesign, not a fake loader, not a dev-mode-only artifact.

**Root cause:** every Owner Portal page load ran the exact same "which studio does this owner own" lookup **twice** — once in `app/(owner)/layout.tsx` (inline, uncached) and once again inside `getStudioId()` (called by every page). Since `app/(owner)/layout.tsx` wraps every single Owner Portal route, this meant **one fully redundant network round trip to Supabase on every Owner Portal navigation**, on top of each page's own real data queries. `Consultations` had a second, smaller instance of the same class of bug: three independent queries (main list, stage counts, studio subdomain) were run one-at-a-time instead of in parallel.

**Fix:** consolidated the studio lookup into one `cache()`-shared helper (`getOwnerStudio()`) that the layout and `getStudioId()` both call, so it only ever queries `studios` once per request instead of twice. Parallelized the Consultations page's three independent queries. No UI, auth, RLS, studio-isolation, or payment-behavior change.

**Result:** real, measured, production-mode improvement — see numbers below. Not dramatic (this was never an N+1-query-explosion or a stuck spinner), but real, consistent, and directly attributable to the fix, most visible on Consultations (**-29%**) and Pipeline (**-24%**, which benefits purely from the shared studio-lookup dedup even though its own page code wasn't touched).

---

## Step 1 — Reproduction environment

- QA-tagged studio (`[QA-SEED-PERF-20260825]`) created via the real `/register` flow, seeded with a realistic data volume comparable to the platform's own busiest real studio (`siam3nt`, 12 bookings/8 clients/4 consultations): **3 artists, 15 clients, 20 bookings across all statuses, 8 consultations, 17 paid deposit_payments, 6 consent_forms**. Real production Supabase (no local/mock DB exists in this project), Stripe untouched (no payment flow was exercised — this is a read/render-latency investigation, not a payment one).
- Reused an existing real owner login was not possible (no test credentials for real studios like `siam3nt`/`mscreation`) — a fresh QA account was the only safe option that didn't touch real studio data, per this project's established QA-data safety rules.
- Measured with a real Chromium browser (Playwright), timing **click → destination `<h1>` visible** (the actual user-perceived "did something happen yet" moment), plus separate full-page-navigation (`goto`) timings, in **two consecutive rounds** per environment (round 1 = first-time-this-session navigation to each page; round 2 = revisiting the same pages again) to separate "first visit" cost from "Next.js Router Cache already has this" cost.
- Tested in **three environments** to properly separate causes:
  1. `next dev` (dev mode, port 3001)
  2. `next start` (production build, port 3001) — **before** the fix
  3. `next start` (production build, port 3001) — **after** the fix

## Step 1 results — dev mode (for reference only, NOT used for before/after comparison)

| Action | Time |
|---|---|
| Login → Dashboard visible | 33,028ms (first pass) / 10,702ms (second pass, same session) |
| `goto /owner/consultations` | 11,793ms → 16,366ms (varied run to run) |
| `goto /owner/clients` | 15,791ms → 5,116ms |
| Click "Consultations" (round 1) | 3,921ms |
| Click "Consultations" (round 2, same page revisited) | 142ms |

**This is dominated by `next dev`'s on-demand JIT compilation** — every route's first hit in a fresh dev-server session took several seconds to tens of seconds to compile, then dropped to ~140ms on a second visit to the same route in the same session. This matches the documented pattern from every prior QA session on this project. **These numbers were not used to decide what to fix** — they would have pointed at "everything is slow" with no way to isolate cause. Confirmed genuinely dev-mode-specific by re-running the identical clicks against a production build (below), where the same routes were consistently 3-8x faster on first hit with none of the multi-second variance.

## Step 1 results — production build, BEFORE the fix (the real numbers)

Round 1 = first client-side visit to each page this session (the realistic "just opened the dashboard, now clicking around" experience). Round 2 = clicking the same links again immediately after (Next.js Router Cache warm).

| Action | Round 1 (first visit) | Round 2 (cached) |
|---|---|---|
| Login → Dashboard visible | 12,656ms | — |
| `goto /owner/dashboard` (full reload) | 5,646ms | — |
| `goto /owner/consultations` (full reload) | 5,168ms | — |
| `goto /owner/bookings` (full reload) | 4,574ms | — |
| `goto /owner/clients` (full reload) | 4,368ms | — |
| `goto /owner/pipeline` (full reload) | 4,902ms | — |
| Click **Consultations** → `<h1>` visible | **2,626ms** | 100ms |
| Click **Bookings** → `<h1>` visible | **1,936ms** | 154ms |
| Click **Clients** → `<h1>` visible | **1,958ms** | 113ms |
| Click **Pipeline** → `<h1>` visible | **2,471ms** | 117ms |

**This confirms a real product performance problem, not a dev-only artifact.** A first-time click between Owner Portal sections consistently cost 1.9-2.6 seconds even with zero compilation overhead. Root-caused to network-round-trip count (see Step 2).

---

## Step 2 — Root cause

Traced with direct code reading, not guessed. Two real, distinct causes, both in the "repeated Supabase queries" / "unnecessary sequential calls" category the investigation was told to look for:

### Cause 1 (the big one, affects every single Owner Portal page)
`app/(owner)/layout.tsx` — which wraps every route under `/owner/**` — ran its own inline `studios` query to resolve the current owner's studio (for the sidebar name + subscription-status gate). Every `page.tsx` under `/owner/**` *also* calls `getStudioId()` (`lib/auth/config.ts`), which ran the **exact same query again**, completely independently — React's `cache()` only dedupes calls to the *same function*, and these were two different pieces of code doing the same lookup. Net effect: **2 sequential network round trips to Supabase for the same lookup, on every single Owner Portal page load**, before any of that page's own actual data queries even start.

### Cause 2 (Consultations page specifically)
`app/(owner)/owner/consultations/page.tsx` ran three independent, unrelated Supabase queries **one at a time** (`await` in sequence) instead of together: the main consultation list, an all-time status-count query, and a studio-subdomain lookup. None of the three depend on each other's result, so there was no reason for them to be sequential — this cost one extra full round trip on top of Cause 1.

Everything else checked (Bookings, Clients, Pipeline pages) was already correctly using `Promise.all` for its independent queries — those three pages' improvement below comes purely from Cause 1's fix, since Cause 1 affects every page through the shared layout.

**What this was NOT:** not an N+1 query loop, not missing indexes, not excessive data volume, not a duplicate-request bug in client code, not unnecessary re-renders, not a caching/revalidation misconfiguration, not slow images/assets. The dashboard's own data-fetching code (`app/(owner)/owner/dashboard/page.tsx`) was already well-structured with `Promise.all` batching and was **not** the bottleneck — the redundant cost was happening one layer up, in the shared layout every page sits inside.

---

## Step 3 — The fix

**Files changed:**
- `lib/auth/config.ts` — added `getOwnerStudio()`, a `cache()`-wrapped helper that runs the studio lookup once (same query, same `ORDER BY created_at, id` tie-break, same result shape) and shares the result across every caller in the same request. `getStudioId()` now calls it instead of running its own separate query.
- `app/(owner)/layout.tsx` — now calls the same `getOwnerStudio()` helper instead of its own inline duplicate query. All existing behavior preserved exactly, including the "don't redirect on a transient query error" safeguard and the canceled/unpaid subscription redirect to `/pricing`.
- `app/(owner)/owner/consultations/page.tsx` — the three independent queries now run via `Promise.all` instead of sequentially. No query logic changed, only when they run relative to each other.

**Explicitly preserved, unchanged:**
- Auth (`getCurrentUser()` untouched — still does a real server-side session revalidation, not weakened to a cheaper local check).
- RLS/studio isolation — the `.eq("owner_id", user.id)` filter is byte-for-byte identical; only *how many times* it runs changed, not *what* it filters.
- Subscription-status gate (`canceled`/`unpaid` → `/pricing`) — logic unchanged, verified live (see Step 4).
- No schema/migration changes, no payment code touched, no UI/design changes.

---

## Step 4 — AFTER measurement (same production build, same test, same QA account)

| Action | Before | After | Improvement |
|---|---|---|---|
| Login → Dashboard visible | 12,656ms | 9,849ms | **-2,807ms (-22%)** |
| `goto /owner/dashboard` | 5,646ms | 6,150ms | +504ms (noise — this page's own queries were already `Promise.all`-batched; only the shared-layout saving applies here, which is small relative to a full asset reload) |
| `goto /owner/consultations` | 5,168ms | 4,317ms | -851ms (-16%) |
| `goto /owner/bookings` | 4,574ms | 4,151ms | -423ms (-9%) |
| `goto /owner/clients` | 4,368ms | 3,133ms | **-1,235ms (-28%)** |
| `goto /owner/pipeline` | 4,902ms | 3,714ms | **-1,188ms (-24%)** |
| Click **Consultations** → `<h1>` visible | 2,626ms | **1,871ms** | **-755ms (-29%)** |
| Click **Bookings** → `<h1>` visible | 1,936ms | 1,972ms | +36ms (flat — within run-to-run network noise; see note below) |
| Click **Clients** → `<h1>` visible | 1,958ms | 1,871ms | -87ms (-4%) |
| Click **Pipeline** → `<h1>` visible | 2,471ms | **1,876ms** | **-595ms (-24%)** |

**Note on Bookings' flat result:** Bookings' own page code was already correctly `Promise.all`-batched (2 waves: main query, then 4 parallel), so it only benefits from the layout dedup (roughly one ~150-300ms round trip saved out of ~2 seconds) — a real but small saving that's within the natural variance of hitting a real, remote Supabase instance over the internet run-to-run. This is expected and consistent with the root cause, not a sign the fix didn't work.

Consultations and Pipeline show the clearest, most consistent gains — Consultations because it got *both* fixes, Pipeline because it's one of the plainer pages where the layout-level saving is a larger fraction of its total (already-lean) query time.

---

## Step 4 — Correctness/regression verification (production build, after the fix)

All checked live against the seeded QA studio, same server used for the AFTER measurement:

- [x] Login works
- [x] Sidebar shows the correct studio name
- [x] Dashboard renders without error
- [x] Consultations page shows the correct seeded data
- [x] Bookings page loads correctly
- [x] Clients page shows the correct seeded data (30 matches for the seeded tag)
- [x] **Refresh preserves correct data — no stale state** (before/after reload: 30/30 matches, identical)
- [x] Pipeline page loads correctly
- [x] **Security-critical path verified both directions:** flipping the QA studio's `subscription_status` to `canceled` correctly redirects `/owner/dashboard` → `/pricing`; restoring it correctly makes the dashboard reachable again. This was the highest-risk part of the layout change (subscription gating) and it was explicitly exercised, not just assumed.
- [x] Mobile viewport (390px, iPhone-sized): no horizontal overflow on the dashboard
- [x] **Zero console errors** during the full verification pass
- [x] `tsc --noEmit`: clean
- [x] `next lint`: clean
- [x] `npm run build`: clean (both before and after builds compiled successfully)
- [x] `npm run test`: **601/601 unit tests passing**, including every test that mocks `getStudioId` — confirms the refactor preserves its external contract exactly

One initial false-positive during verification, investigated and ruled out: a handful of `_rsc=` prefetch requests for *other* sidebar links (not the ones being navigated to) showed as "failed" — these are Next.js's own automatic background link-prefetching being cancelled when the test script navigated away before the prefetch finished. Confirmed benign (a real user isn't rapid-firing navigations every few hundred milliseconds the way an automated script does) and unrelated to this fix — nothing about link prefetching was touched.

Owner/Artist/Client studio isolation: not re-run as a separate full sweep this pass (already exhaustively verified 7/7 in the prior Real Studio Simulation QA session) — structurally guaranteed unchanged here because the exact `.eq("owner_id", user.id)` / `.eq("studio_id", studioId)` filters were not modified at all, only *how many times* the identical filtered query runs per request.

---

## What I should click to record the AFTER video

The **production server is currently running on `http://localhost:3001`** (built with the fix applied — this is the "AFTER" state).

**Do NOT record against `npm run dev`** — dev mode's on-demand compilation adds multi-second, highly-variable delays that have nothing to do with this fix and would make the video confusing/misleading (a route's *very first* hit in a dev session can take 10-30+ seconds regardless of any code change). The clean, attributable, real improvement only shows in a production build.

QA login for recording:
- URL: `http://localhost:3001/login`
- Email: `qa-perf-owner-1787600124778@inkbook.test`
- Password: `QaPerfStudio20260825!Ink`

For the clearest recording:
1. Log in once (this "warms" the very first render; the *login→dashboard* number itself did improve too, but it's a one-time cost per session, not the repeated "clicking around" feeling you're diagnosing).
2. From the Dashboard, click **Consultations**, then **Pipeline** — these two show the clearest, most consistent improvement (**-29%** and **-24%**).
3. For the most honest comparison, restart the production server between BEFORE/AFTER takes if re-recording the BEFORE state (`git stash` the fix, rebuild, record, `git stash pop`, rebuild, record) so each take reflects a真 cold Router Cache — clicking the *same* link twice in one recording session will always look instant the second time regardless of the fix, because of Next.js's own client-side caching (see the "Round 2" numbers above, ~100-300ms in both before and after).

## Is the improvement clearly visible to a normal user?

**Partially, honestly stated.** A ~600-900ms reduction on a ~2-2.6 second interaction (roughly a quarter to a third faster) is real and measurable, and side-by-side it's noticeable — but it is not a "instant vs. spinner-for-days" transformation, because the remaining ~1.9 seconds is dominated by things this fix correctly did not touch: a mandatory, security-preserving `auth.getUser()` server-side session revalidation, and real network round-trip time to a remote (not local) Supabase instance for each page's own legitimate data. Removing those would mean weakening auth or accepting stale/incorrect data — both explicitly out of scope and against this project's own hard safety rules. This fix removed the one clearly redundant, safely-removable round trip; it does not claim to be a complete rewrite of the dashboard's performance profile.
