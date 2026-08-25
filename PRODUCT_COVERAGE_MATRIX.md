# InkBook — Product Coverage Matrix

Route/surface-level inventory. Discovered from `app/**` (page routes),
`app/api/**` (API routes), and `**/actions.ts` (server actions) via
filesystem enumeration, cross-checked against `grep` for live references
before marking anything NOT_APPLICABLE. Status legend: PASS, FAIL, FIXED→
RETESTED→PASS, BLOCKED_EXTERNAL, BLOCKED_NEEDS_SIAM, NOT_APPLICABLE (reason
required), NOT_TESTED.

## AUTH (3 pages + 1 invite-accept flow)
| Route | Status | Evidence |
|---|---|---|
| `/login` | NOT_TESTED | |
| `/register` | NOT_TESTED | |
| `/reset-password` | NOT_TESTED | |
| `/artist/accept/[token]` | NOT_TESTED | |

## OWNER PORTAL (20 top-level + 3 detail routes)
| Route | Status | Evidence |
|---|---|---|
| `/owner/dashboard` | NOT_TESTED | |
| `/owner/consultations` | NOT_TESTED | |
| `/owner/consultations/[id]` | NOT_TESTED | |
| `/owner/pipeline` | NOT_TESTED | |
| `/owner/artists` | NOT_TESTED | |
| `/owner/artists/new` | NOT_TESTED | |
| `/owner/artists/[artistId]` | NOT_TESTED | |
| `/owner/bookings` | NOT_TESTED | |
| `/owner/bookings/[bookingId]` | NOT_TESTED | |
| `/owner/requests` | NOT_TESTED | |
| `/owner/requests/[id]` | NOT_TESTED | |
| `/owner/messages` | NOT_TESTED | |
| `/owner/messages/[threadId]` | NOT_TESTED | |
| `/owner/flash` | NOT_TESTED | |
| `/owner/clients` | NOT_TESTED | |
| `/owner/revenue` | NOT_TESTED | |
| `/owner/reviews` | NOT_TESTED | |
| `/owner/blacklist` | NOT_TESTED | |
| `/owner/consent-forms` | NOT_TESTED | |
| `/owner/waitlist` | NOT_TESTED | |
| `/owner/knowledge` | NOT_TESTED | |
| `/owner/audit-log` | NOT_TESTED | |
| `/owner/settings` | NOT_TESTED | |
| `/owner/settings/billing` | NOT_TESTED | |
| `/owner/settings/studio` | NOT_TESTED | |

## ARTIST PORTAL (11 top-level + 6 detail/sub routes)
| Route | Status | Evidence |
|---|---|---|
| `/artist/dashboard` | NOT_TESTED | |
| `/artist/consultations` | NOT_TESTED | |
| `/artist/consultations/[id]` | NOT_TESTED | |
| `/artist/schedule` | NOT_TESTED | |
| `/artist/bookings` | NOT_TESTED | |
| `/artist/bookings/[bookingId]` | NOT_TESTED | |
| `/artist/requests` | NOT_TESTED | |
| `/artist/requests/[id]` | NOT_TESTED | |
| `/artist/messages` | NOT_TESTED | |
| `/artist/messages/[threadId]` | NOT_TESTED | |
| `/artist/portfolio` | NOT_TESTED | |
| `/artist/flash` | NOT_TESTED | |
| `/artist/earnings` | NOT_TESTED | |
| `/artist/clients` | NOT_TESTED | |
| `/artist/clients/[clientId]` | NOT_TESTED | |
| `/artist/agreements` | NOT_TESTED | |
| `/artist/agreements/[id]` | NOT_TESTED | |
| `/artist/agreements/new` | NOT_TESTED | |

## CLIENT PORTAL — LIVE (`app/portal/[studio]/**`, 7 top-level + 4 sub)
| Route | Status | Evidence |
|---|---|---|
| `/portal/[studio]/dashboard` | NOT_TESTED | |
| `/portal/[studio]/consultation` | NOT_TESTED | |
| `/portal/[studio]/projects` | NOT_TESTED | |
| `/portal/[studio]/projects/[id]` | NOT_TESTED | |
| `/portal/[studio]/projects/[id]/consent` | NOT_TESTED | |
| `/portal/[studio]/bookings` | NOT_TESTED | |
| `/portal/[studio]/bookings/[bookingId]` | NOT_TESTED | |
| `/portal/[studio]/bookings/[bookingId]/review` | NOT_TESTED | |
| `/portal/[studio]/history` | NOT_TESTED | |
| `/portal/[studio]/messages` | NOT_TESTED | |
| `/portal/[studio]/messages/[threadId]` | NOT_TESTED | |
| `/portal/[studio]/settings` | NOT_TESTED | |

## CLIENT PORTAL — ORPHANED PROTOTYPE (`app/client-portal/[studio]/**`)
| Route | Status | Evidence |
|---|---|---|
| `/client-portal/[studio]` | NOT_APPLICABLE | Orphaned prototype — fresh `grep -rl` this session (2026-08-25) found zero live references to this route tree from any reachable app code; only coincidental matches were the unrelated `lib/client-portal/*` utility module used by the real `app/portal/[studio]/**` routes. Matches prior audit finding (memory: "Orphaned app/client-portal/** prototype... zero live references"). Not part of exhaustive scope — testing a route nothing links to would not verify anything real. |
| `/client-portal/[studio]/home` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/my-profile` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/my-tattoos` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/my-tattoos/[id]` | NOT_APPLICABLE | Same reason |
| `/client-portal/[studio]/studio` | NOT_APPLICABLE | Same reason |

## LEGACY REDIRECT HUB (`app/dashboard/**`)
| Route | Status | Evidence |
|---|---|---|
| `/dashboard` | NOT_TESTED | Real route — always redirects (owner→`/owner/dashboard`, artist→`/artist/dashboard`, else→`/register`); the redirect LOGIC itself is testable/real even though the page body never renders. Will verify redirect correctness for all 3 branches. |
| `/dashboard/artists` | NOT_APPLICABLE | Unreachable — `/dashboard/page.tsx` always redirects before any child route can render; confirmed zero live `<Link>`/`router.push` references to this path via fresh grep this session. |
| `/dashboard/bookings` | NOT_APPLICABLE | Same reason |
| `/dashboard/consent-forms` | NOT_APPLICABLE | Same reason |

## PUBLIC / WHITE-LABEL BOOKING (real dynamic `/book/[studio]/**`)
| Route | Status | Evidence |
|---|---|---|
| `/book/[studio]` | NOT_TESTED | |
| `/book/[studio]/[artistId]` | NOT_TESTED | |
| `/book/[studio]/[artistId]/book` | NOT_TESTED | |
| `/book/[studio]/[artistId]/book/consent` | NOT_TESTED | |
| `/book/[studio]/[artistId]/book/deposit` | NOT_TESTED | |
| `/book/[studio]/[artistId]/book/confirmation` | NOT_TESTED | |
| `/book/[studio]/consult` | NOT_TESTED | |
| `/book/[studio]/consent` | NOT_TESTED | |
| `/book/[studio]/custom` | NOT_TESTED | |
| `/book/[studio]/flash/[flashId]/book` | NOT_TESTED | |
| `/book/[studio]/request/[id]` | NOT_TESTED | |
| `/book/[studio]/login` | NOT_TESTED | |
| `/book/[studio]/login/verify` | NOT_TESTED | |

## PUBLIC / MARKETING (out of design scope, still functionally testable)
| Route | Status | Evidence |
|---|---|---|
| `/` (landing) | NOT_TESTED | |
| `/pricing` | NOT_TESTED | |
| `/privacy` | NOT_TESTED | |
| `/terms` | NOT_TESTED | |
| `/book/demo-studio` | NOT_TESTED | Static demo page, distinct from the real `/book/[studio]` dynamic route |
| `/book/demo-studio/consult` | NOT_TESTED | |

## API ROUTES (31)
| Route | Status | Evidence |
|---|---|---|
| `POST /api/ai/artist-match` | NOT_TESTED | |
| `POST /api/ai/consultation-questions` | NOT_TESTED | |
| `POST /api/ai/quote-generate` | NOT_TESTED | |
| `POST /api/ai/style-detect` | NOT_TESTED | |
| `/api/artists` | NOT_TESTED | |
| `/api/auth/[...nextauth]` | NOT_TESTED | Verify this is actually live/used — project's real auth is Supabase Auth, not NextAuth; may be dead |
| `/api/billing/create-checkout` | NOT_TESTED | |
| `/api/billing/portal` | NOT_TESTED | |
| `POST /api/billing/webhook` | NOT_TESTED | |
| `POST /api/bookings` | NOT_TESTED | |
| `/api/consent-forms` | NOT_TESTED | |
| `/api/consent-forms/standalone` | NOT_TESTED | |
| `GET /api/cron/cancel-expired` | NOT_TESTED | |
| `GET /api/cron/no-show` | NOT_TESTED | |
| `GET /api/cron/payment-reminders` | NOT_TESTED | |
| `GET /api/cron/review-requests` | NOT_TESTED | |
| `GET /api/cron/sms-reminders` | NOT_TESTED | |
| `GET /api/cron/waitlist-notify` | NOT_TESTED | |
| `/api/custom-requests` | NOT_TESTED | |
| `POST /api/custom-requests/[id]/decline` | NOT_TESTED | |
| `POST /api/custom-requests/[id]/deposit` | NOT_TESTED | |
| `POST /api/custom-requests/[id]/quote` | NOT_TESTED | |
| `POST /api/custom-requests/[id]/schedule` | NOT_TESTED | |
| `POST /api/owner/clients/import` | NOT_TESTED | |
| `/api/reminders` | NOT_TESTED | |
| `POST /api/send-sms` | NOT_TESTED | |
| `POST /api/stripe/checkout` | NOT_TESTED | Legacy/dead-code-adjacent per prior audit — verify current live status, do not touch routing |
| `POST /api/stripe/connect/login-link` | NOT_TESTED | |
| `POST /api/stripe/connect/onboard` | NOT_TESTED | |
| `POST /api/stripe/connect-webhook` | NOT_TESTED | Real-money-adjacent — test mode / signature-failure paths only |
| `POST /api/stripe/webhook` | NOT_TESTED | Real-money-adjacent — test mode / signature-failure paths only |
| `/api/studios` | NOT_TESTED | |
| `POST /api/twilio/sms` | NOT_TESTED | Do not send real SMS to real numbers |
| `/api/waitlist` | NOT_TESTED | |

## SERVER ACTION FILES (26) — exercised via their owning route's UI, not directly
| File | Status |
|---|---|
| `app/(artist)/artist/agreements/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/bookings/[bookingId]/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/consultations/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/flash/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/messages/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/portfolio/actions.ts` | NOT_TESTED |
| `app/(artist)/artist/schedule/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/artists/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/audit-log/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/blacklist/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/bookings/[bookingId]/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/flash/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/knowledge/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/messages/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/reviews/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/settings/studio/actions.ts` | NOT_TESTED |
| `app/(owner)/owner/waitlist/actions.ts` | NOT_TESTED |
| `app/artist/accept/[token]/actions.ts` | NOT_TESTED |
| `app/book/[studio]/consult/actions.ts` | NOT_TESTED |
| `app/book/[studio]/custom/actions.ts` | NOT_TESTED |
| `app/book/[studio]/flash/[flashId]/book/actions.ts` | NOT_TESTED |
| `app/client-portal/[studio]/my-profile/actions.ts` | NOT_APPLICABLE | Belongs to the orphaned prototype tree |
| `app/portal/[studio]/consultation/actions.ts` | NOT_TESTED |
| `app/portal/[studio]/messages/actions.ts` | NOT_TESTED |
| `app/portal/[studio]/projects/[id]/actions.ts` | NOT_TESTED |
| `app/portal/[studio]/settings/actions.ts` | NOT_TESTED |

## CRON ROUTES (from `vercel.json`)
See API section above (`/api/cron/*`) — cross-reference with `vercel.json`
schedule config during Phase Q.

## SUMMARY COUNTS
- Page routes inventoried: 76 (66 live/testable, 10 NOT_APPLICABLE orphaned/unreachable)
- API routes inventoried: 31
- Server action files inventoried: 26 (25 live, 1 NOT_APPLICABLE)
- **Total testable surfaces: 122**
