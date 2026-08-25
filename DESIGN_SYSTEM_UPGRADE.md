# InkBook — Unified Premium Design System Upgrade

Autonomous mission tracker. Started 2026-08-25. Follows the "InkBook Full Unified
Premium Design System" mission brief (light premium + soft 3D + Stripe-clean
structure + subtle cursor-reactive motion), scoped to Owner Portal, Artist Portal,
Client Portal, and Auth (Login/Register/Reset Password). The public marketing site
(`app/(public)`, landing page, pricing) keeps its existing dark/gold brand — out of
scope, not touched.

## CURRENT STAGE
Stage 10-12: portal page sweep. Foundation (shell/tokens/motion/auth) is landed
and committed on branch `feature/design-system-upgrade` (commit `1e73635`).
3 parallel background agents are finishing the remaining page sweep in
isolated worktrees: Owner Portal (artists/clients/requests pages), Client
Portal (~7 remaining dark pages under app/portal/[studio]), Artist Portal
(full verification pass). Their branches need merging into
`feature/design-system-upgrade` once they report back.

## KEY AUDIT FINDING (governs the whole mission)
The app already has **two competing design systems live in production**, not zero:

1. **Light/violet system** — already used by most Owner Portal page *content*
   (`OwnerSidebar.tsx`, `StatsGrid.tsx`, most `app/(owner)/**/page.tsx` via a
   `-m-4 -mt-16 ... style={{background:"#FAF9FC"}}` breakout hack), most Artist
   Portal page content, and about half of Client Portal pages. White cards,
   `rounded-2xl border-zinc-200 shadow-sm`, `violet-600`/`violet-50` accents,
   Lucide icons. This is the direction to standardize on — it already matches the
   mission's "light premium + soft purple accent" brief closely.
2. **Dark/gold legacy system** — still used by every portal's outer **shell**:
   `app/(owner)/layout.tsx` and `app/(artist)/layout.tsx` (`bg-ink text-white`),
   `components/shared/Sidebar.tsx` (the Artist Portal's sidebar — dark, gold,
   `font-cinzel`), `app/portal/[studio]/layout.tsx` + `PortalSidebar.tsx` (Client
   Portal, `bg-[#0A0A0A]`), and all of Auth (`app/(auth)/layout.tsx` +
   login/register/reset-password pages).

So the real problem isn't "redesign everything from scratch" — it's that the
**chrome** (sidebars + shells + auth) never got the light/violet update that the
**content** already has, forcing every converted page to fight its own dark
layout with a negative-margin repaint hack. Fixing the shell-level files removes
the need for that hack everywhere at once and is the highest-leverage work in
this mission.

## COMPLETED STAGES
- [x] Stage 0 — read project state (CLAUDE.md, TASKS.md, MASTER_PLAN.md, no
      REAL_STUDIO_QA/BETA files needed for this pass), git status clean except
      pre-existing untracked `.agents/`/`AGENTS.md` (not touched).
- [x] Stage 1 — cross-portal audit (see finding above + per-file notes below).
- [ ] Stage 2 — design tokens (in progress: documenting existing convention +
      small `tailwind.config.ts` elevation-shadow additions, not a full CSS
      variable rewrite — see "Design tokens" below for why).
- [ ] Stage 3 — typography/spacing normalization
- [ ] Stage 4 — shared card system
- [ ] Stage 5 — button system
- [ ] Stage 6 — input/form system
- [ ] Stage 7 — password visibility icon (was **completely absent**, not just
      low-contrast — building it fresh as `components/ui/PasswordInput.tsx`)
- [ ] Stage 8 — icon system (Lucide already the de facto standard in the light
      system; legacy dark shell uses no icons/emoji — normalizing on Lucide)
- [ ] Stage 9 — sidebar/nav unification (Owner already light; Artist + Client
      Portal sidebars need conversion to match)
- [ ] Stage 10 — Owner Portal upgrade (mostly done pre-mission; 5 pages need the
      light conversion finished; shell fix benefits all 25)
- [ ] Stage 11 — Artist Portal upgrade (content mostly light already; sidebar +
      shell need conversion)
- [ ] Stage 12 — Client Portal upgrade (~7/12 pages still on dark shell)
- [ ] Stage 13 — Auth upgrade (Login/Register/Reset Password — currently 100%
      dark/gold, needs full conversion + password toggle)
- [ ] Stage 14 — soft 3D depth
- [ ] Stage 15 — cursor-reactive motion system
- [ ] Mobile/touch pass
- [ ] Reduced-motion pass
- [ ] Accessibility pass
- [ ] Visual QA
- [ ] Bug fix loop
- [ ] Cross-portal consistency check
- [ ] Final verify (tsc/lint/test/build)
- [ ] Final report to Siam

## PORTALS COMPLETED
None fully locked yet — foundation (shell + auth + tokens) in progress.

## Design tokens — approach decision
The codebase has **no existing shared UI primitives** (`components/ui/` doesn't
exist yet) and ~50 files already hand-roll a *consistent* Tailwind vocabulary:
white `rounded-2xl border border-zinc-200 shadow-sm` cards, `violet-600`/
`violet-50` accents, Lucide icons, `text-zinc-900`/`text-zinc-500`/`text-zinc-400`
text hierarchy. Introducing a parallel CSS-variable token layer that those 50
files don't consume would add a second system instead of unifying one.

Decision: **formalize the existing convention as the documented token system**
(below), add small genuinely-new additive pieces (elevation shadow scale in
`tailwind.config.ts`, motion utility classes in `app/globals.css` under a new
`INKBOOK PRODUCT (PORTAL) SYSTEM` section — scoped to not touch any existing
marketing-site class), and build real shared components (`PasswordInput`,
motion wrappers) that new/fixed pages use going forward. `app/globals.css`'s
existing dark/gold marketing animations are left untouched — different brand
surface, out of scope.

**Color**
- Background (page): `#FAF9FC` (or `bg-zinc-50` where exact hex isn't needed)
- Surface (card): `#FFFFFF`
- Border: `border-zinc-200` (default), `border-zinc-100` (subtle/dividers)
- Text: `text-zinc-900` (primary), `text-zinc-500` (secondary), `text-zinc-400` (meta)
- Accent: `violet-600` (primary actions/active state), `violet-50`/`violet-700` (soft accent fill/text)
- Client Portal keeps its existing per-studio dynamic `brandColor` accent instead
  of a hardcoded violet — that's intentional white-label behavior, not an
  inconsistency to fix.

**Radius:** `rounded-lg` (controls/buttons/inputs), `rounded-xl` (small cards),
`rounded-2xl` (standard cards) — already the dominant pattern, just naming it.

**Shadow (3 levels, new `tailwind.config.ts` tokens):** `shadow-sm` (existing
Tailwind, level 1 — flat cards, tables), `shadow-elevation-2` (level 2 — standard
raised card, new token), `shadow-elevation-3` (level 3 — premium/floating
dashboard card, new token, used with motion).

## MOTION STATUS
Not yet built — next after shell/tokens/auth land.

## AUTH STATUS
Not yet converted. Login/Register/Reset Password are 100% dark/gold legacy,
zero password-visibility toggle anywhere (input is plain `type="password"`).

## MOBILE STATUS / ACCESSIBILITY STATUS
Not yet assessed this pass — existing a11y label work (memory:
`feedback_migration_verification`-adjacent, `fix(a11y)` commits) is preserved,
not re-litigated.

## BUGS FOUND
1. Dark-shell/light-content split described above (the core finding) — not a
   crash bug, a real cross-portal visual-consistency defect. **FIXED.**
2. Auth had no password show/hide control at all, anywhere in the app
   (login/register/reset-password AND the artist-invite-accept flow). **FIXED**
   — new `components/ui/PasswordInput.tsx` used in all 5 password fields
   across the app (verified via `grep type="password"` — no others exist).
3. **Real, previously-undiscovered production bug**: `font-cinzel` was
   referenced as a CSS class in 14 files (Auth, Navbar, old `/dashboard` hub,
   `/book/[studio]/consult`+`/custom`+`/request` pages, marketing landing
   sections) but never defined anywhere — no such font is loaded (the real
   serif font is Instrument Serif, exposed as `font-serif`), and Tailwind
   silently drops unrecognized utility classes. Confirmed via the compiled
   `.next/static/css` output containing zero matches for `.font-cinzel`,
   `.bg-ink`, `.label-xs`, `.grain`, or `.gold-divider` anywhere. **FIXED**
   (global rename `font-cinzel` → `font-serif`, verified safe — it's the
   correct already-loaded font, not a style regression).
4. `bg-ink`, `label-xs`, `gold-divider`, `.grain` are ALSO dead/undefined
   classes (same root cause), but only in files outside this mission's scope
   (public marketing site — `components/landing/**`, `components/shared/Navbar.tsx`
   which is dead/unused code, not imported anywhere). Deliberately NOT touched
   — out of scope (marketing site keeps its existing approved dark/gold brand)
   and not worth a special-case exception. Flagged here for Siam's awareness;
   not launch-blocking.
5. 5 Owner pages (`artists`, `artists/new`, `artists/[artistId]`, `clients`,
   `requests`) had neither the `FAF9FC` light hack nor obvious dark markers —
   assigned to a background sweep agent to verify/fix.
6. `app/dashboard/page.tsx` (the post-login role-redirect hub) always redirects
   before rendering anything (owner→`/owner/dashboard`, artist→`/artist/dashboard`,
   new user→`/register`) — its dark-themed `layout.tsx`/`DashboardSidebar.tsx`
   are unreachable in practice. Confirmed via reading the redirect logic, not
   fixed (no user ever sees it, not worth the churn).
7. Minor: reset-password's small logo mark used `rounded-lg` filled square while
   login/register used a bordered (no fill) square — inconsistent even within
   Auth alone. **FIXED** — all 3 Auth pages + artist-accept-invite now use the
   same `w-8 h-8 rounded-lg bg-violet-600` logo mark.
8. Mobile sidebar toggle buttons across all 3 portals used raw `"✕"`/`"☰"` text
   characters instead of real icons (icon-system inconsistency, Stage 8).
   **FIXED** — normalized to Lucide `<X>`/`<Menu>` in `OwnerSidebar.tsx`,
   `components/shared/Sidebar.tsx`, `PortalSidebar.tsx`.

## BUGS FIXED
See items above marked FIXED. All verified with `tsc --noEmit` + `npm run lint`
clean after each batch; `npm run test` still 601/601 after the foundation commit.

## DEFERRED ISSUES
(none yet — record here if something needs Siam per CLAUDE.md's approval-gate list)

## NEXT EXACT TASK
Fix `app/(owner)/layout.tsx` + `app/(artist)/layout.tsx` shell backgrounds to
light, convert `components/shared/Sidebar.tsx` to match `OwnerSidebar.tsx`'s
visual language, then Client Portal shell, then Auth.
