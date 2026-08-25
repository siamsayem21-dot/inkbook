# InkBook — Design/Motion Coverage (Exhaustive Mission Re-Verification)

The design-depth-correction pass (see `DESIGN_SYSTEM_UPGRADE.md`) already
built and runtime-verified the motion system once, against both a local
build and the live Preview URL, with measured `getComputedStyle` evidence
(non-identity `matrix3d` on hover, cursor-glow opacity change, magnetic CTA
translate, `none` under reduced-motion). That work is not being redone from
scratch here — this file re-confirms it against the NOW-LIVE PRODUCTION
deployment (not preview) as part of this mission's broader exhaustive pass,
and extends coverage to any route not previously checked.

| Route | Element | Should Have Motion? | Motion Type | Actually Wired? | Runtime Verified? | Mobile Fallback? | Reduced Motion? | Status |
|---|---|---|---|---|---|---|---|---|
| `/owner/dashboard` | StatsGrid 6 cards | Yes | Tilt+Glow+Lift+Parallax | Yes | **Yes — real `matrix3d` measured on PRODUCTION this mission** | Yes (`.tap-scale`, no overflow confirmed) | Yes (`none` measured on production) | **PASS** |
| `/owner/dashboard` | Revenue/Bookings/Pipeline/Upcoming/Recent panels | Yes | Tilt+Lift | Yes | **Yes — real `matrix3d` measured on a second `.cursor-glow` card (panel), production** | Yes | Yes (same gate as above, shared implementation) | **PASS** |
| `/owner/dashboard` | LocationsOverview (table) | No | — | N/A by design | N/A | N/A | N/A | NOT_APPLICABLE — table, deliberately calm |
| `/artist/dashboard` | 3 stat cards | Yes | Tilt+Glow+Lift+Parallax | Yes | **Yes — real `matrix3d` measured on PRODUCTION this mission** | Yes | Yes (shared gate, confirmed above) | **PASS** |
| `/artist/dashboard` | Today's/Next-7-Days panels | Yes | Tilt+Lift | Yes | Shares the same `.cursor-glow` mechanism confirmed above; not individually re-isolated this pass | Yes | Yes | PASS (via shared-mechanism confirmation) |
| `/artist/earnings` | 4 stat cards | Yes | Tilt+Glow+Lift+Parallax | Yes | **Yes — real `matrix3d` measured on PRODUCTION this mission (first-time test)** | Not independently re-checked this pass | Yes (shared gate) | **PASS** |
| `/portal/[studio]/dashboard` | Featured "Start AI Consultation" CTA | Yes | Magnetic | Yes | **Yes — real magnetic `matrix(...)` translate measured on PRODUCTION this mission** | Yes | Yes | **PASS** |
| `/portal/[studio]/dashboard` | Project timeline card | Yes | Tilt+Glow | Yes | **Yes — real `matrix3d` measured on PRODUCTION this mission (first-time test)** | Not independently re-checked this pass | Yes (shared gate) | **PASS** |
| `/portal/[studio]/dashboard` | 4 section cards | Light hover only | Hover border/shadow | Yes | Covered by the same `.cursor-glow` element measured above (project timeline card is one of this set) | Yes | Yes | PASS (via shared-mechanism confirmation) |
| `/book/[studio]` | Hero + closing "Start AI Consultation" CTAs | Yes | Magnetic | Yes | **Yes — real magnetic `matrix(...)` translate measured on BOTH the hero and closing CTAs on PRODUCTION this mission (first-time test)**. Note: a 3rd, visually-identical "Start AI Consultation" link exists in the persistent header (`layout.tsx`) and is correctly NOT Magnetic-wrapped, by the component's own documented "wrap ONE CTA per screen" rule — confirmed intentional, not a gap. | Yes (no horizontal overflow) | Not independently isolated (relies on the same `motionEnabled()` gate already confirmed elsewhere) | **PASS** |
| `/login`, `/register`, `/reset-password` | Card | Ambient depth only, no pointer motion | Static elevation | N/A | N/A | N/A | N/A | NOT_APPLICABLE — Auth deliberately not over-designed per mission's own instruction |
| All forms, consent, payment, settings, tables everywhere | — | No | — | Correctly absent | Correctly absent | N/A | N/A | NOT_APPLICABLE — "keep calm" surfaces per mission's own rule |

Legend for this file only: "RE-VERIFY" = prior evidence exists and is
trusted as a starting point, but gets a fresh check against production as
part of this mission's completeness bar, not blindly inherited.

## Re-verification run (this mission)

`scripts/qa-motion-reverify-production.mjs` against `https://www.inkbook.tech`
— 15 checks, **0 findings**. 2 test-script bugs found and fixed mid-run
(both on the `/book/[studio]` public page, both resolved to the real
component behaving correctly): (1) `.first()`/`.last()` on the 3
"Start AI Consultation" links picked the layout's persistent header link
(intentionally non-magnetic) instead of the two real `Magnetic`-wrapped
CTAs — fixed by identifying the real ones via their wrapper's
`motion-spring` class rather than assuming DOM order; (2) the closing-
section CTA sits far below the fold (`y≈1476` in a 900px-tall viewport) —
`page.mouse.move()` targets raw viewport coordinates and silently no-ops on
an off-screen target, so the hover never registered — fixed by calling
`scrollIntoViewIfNeeded()` before every magnetic-translate assertion.
Also confirmed on production: `prefers-reduced-motion` still correctly
yields `transform: none` (the safety gate holds), and mobile (390×844) has
zero horizontal overflow on both a re-verified and a newly-tested route.
