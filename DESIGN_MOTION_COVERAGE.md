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
| `/owner/dashboard` | StatsGrid 6 cards | Yes | Tilt+Glow+Lift+Parallax | Yes (prior pass) | Yes (prior pass, `matrix3d` measured) | Yes (`.tap-scale`) | Yes (`none` measured) | RE-VERIFY on production |
| `/owner/dashboard` | Revenue/Bookings/Pipeline/Upcoming/Recent panels | Yes | Tilt+Lift | Yes (prior pass) | Partial (class present, not each individually re-measured) | Yes | Yes | RE-VERIFY |
| `/owner/dashboard` | LocationsOverview (table) | No | — | N/A by design | N/A | N/A | N/A | NOT_APPLICABLE — table, deliberately calm |
| `/artist/dashboard` | 3 stat cards | Yes | Tilt+Glow+Lift+Parallax | Yes (prior pass) | Yes (prior pass, measured) | Yes | Yes | RE-VERIFY |
| `/artist/dashboard` | Today's/Next-7-Days panels | Yes | Tilt+Lift | Yes (prior pass) | Partial | Yes | Yes | RE-VERIFY |
| `/artist/earnings` | 4 stat cards | Yes | Tilt+Glow+Lift+Parallax | Yes (prior pass) | Not yet individually measured | Yes | Yes | NOT_TESTED (new) |
| `/portal/[studio]/dashboard` | Featured "Start AI Consultation" CTA | Yes | Magnetic | Yes (prior pass) | Yes (prior pass, translate matrix measured) | Yes | Yes | RE-VERIFY |
| `/portal/[studio]/dashboard` | Project timeline card | Yes | Tilt+Glow | Yes (prior pass) | Not yet individually measured | Yes | Yes | NOT_TESTED (new) |
| `/portal/[studio]/dashboard` | 4 section cards | Light hover only | Hover border/shadow | Yes | Not yet measured | Yes | Yes | NOT_TESTED (new) |
| `/book/[studio]` | Hero + closing "Start AI Consultation" CTAs | Yes | Magnetic | Yes (prior pass) | Not yet independently measured (Client Portal CTA was measured, these use the same component) | Yes | Yes | NOT_TESTED (new) |
| `/login`, `/register`, `/reset-password` | Card | Ambient depth only, no pointer motion | Static elevation | N/A | N/A | N/A | N/A | NOT_APPLICABLE — Auth deliberately not over-designed per mission's own instruction |
| All forms, consent, payment, settings, tables everywhere | — | No | — | Correctly absent | Correctly absent | N/A | N/A | NOT_APPLICABLE — "keep calm" surfaces per mission's own rule |

Legend for this file only: "RE-VERIFY" = prior evidence exists and is
trusted as a starting point, but gets a fresh check against production as
part of this mission's completeness bar, not blindly inherited.
