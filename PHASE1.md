# InkBook — Phase 1 Completion Document

*Last updated: 2026-06-22*

---

## 1. Completed Features

### White-Label Studio Page
- `/book/[studio]` — dynamic booking page per studio subdomain
- Custom brand colors (primary + secondary), font choice, logo
- Artist grid with style filter, bio, minimum rate
- Flash designs gallery with category filter
- Custom Request CTA → `/book/[studio]/custom`
- AI Consultation CTA → `/book/[studio]/consult`
- Deposit policy notice + footer

### AI Consultation Wizard
- 5-step intake form: description → placement/size → color → AI follow-up questions → style detection
- `POST /api/ai/consultation-questions` — generates 4–5 custom follow-up questions via Claude Haiku
- `POST /api/ai/style-detect` — classifies tattoo style from all intake data
- `POST /api/ai/quote-generate` — estimates price range, session count, hours, difficulty
- Graceful fallback on every AI call — flow never blocks without API key
- Rate-limited: 20 req/min per IP on all three endpoints
- Data saved to `consultations` table on submit
- Studio owner can view at `/owner/consultations` + review quotes at `/owner/consultations/[id]`
- "Book Appointment" action creates booking + client record from consultation

### Lead Pipeline
- Kanban board at `/owner/pipeline` — desktop column view + mobile tabbed view
- Stages: New → Reviewed → Quoted → Deposit Paid → Booked → Completed → Lost
- Inline status change via dropdown
- Optimistic update with revert on error

### Custom Requests
- Client submits at `/book/[studio]/custom` with design description, photos, budget
- Owner reviews at `/owner/requests`, artist at `/artist/requests`
- Owner/artist sends quote with **separate** total and deposit amounts
- Client pays deposit at `/book/[studio]/request/[id]`
- Stripe webhook Branch B updates status to `accepted` on payment
- Email notifications: received → quoted → accepted → declined
- Rate-limited: 5 req/min on submission, 3 req/min on deposit creation

### Flash Designs
- Artists upload at `/artist/flash` — title, image, price, category, repeatable toggle
- Owner reviews all studio flash at `/owner/flash` — toggle availability, delete
- Public gallery shown at `/book/[studio]` via `FlashSection` component
- Non-repeatable designs locked after booking (`is_booked = true`)
- Studio ownership enforced on all mutations (P0 fix applied)

### Deposit Collection
- Stripe Checkout on every booking path
- `deposit_payments` table for owner-initiated deposit requests
- Three webhook branches: A (owner-initiated), B (custom request), C (legacy direct booking)
- Idempotency guard: duplicate webhook events safely ignored
- Booking auto-confirmed + SMS/email sent on payment

### Booking System
- `/book/[studio]/[artistId]/book` — client books directly with an artist
- `/book/[studio]/flash/[flashId]/book` — flash design booking flow
- Duplicate booking protection (same artist + date + time)
- Consent form linked at booking
- `/api/cron/no-show` — auto-marks no-shows, retains deposit
- `/api/cron/sms-reminders` — sends 48hr + day-of SMS via Twilio

### Consent Forms
- State-aware consent form at `/book/[studio]/[artistId]/book/consent`
- Standalone consent at `/book/[studio]/consent`
- Signed forms saved to `consent_forms` table
- Owner reviews at `/owner/consent-forms`

### Studio Branding Settings
- Owner sets colors + font at `/owner/settings/studio`
- Logo upload to Supabase Storage (`studios` bucket)
- Hex color validation server-side
- Font options: Default (Cinzel serif), Bold (heavy), Elegant (sans-serif)
- Changes reflected immediately on public booking page

### Team Management
- Owner invites artists at `/owner/artists` → 7-day email token
- Artist accepts at `/artist/accept/[token]` — sets password, completes profile
- Artist removed from studio via owner dashboard
- Pending invites can be resent or cancelled

### Multi-Artist Support
- Each artist has own portfolio, schedule, flash gallery, earnings view
- Owner sees all artists + upcoming booking counts
- Minimum rate per artist enforced (owner-set floor)

### Client CRM
- `/owner/clients` — full client list per studio
- `/artist/clients` — artist's own client list
- Clients scoped to studio (RLS enforced)

### Revenue Dashboard
- `/owner/revenue` — total revenue summary
- `/owner/bookings` — all bookings with deposit status, artist, date
- `/owner/dashboard` — summary stats

### Artist Dashboard
- `/artist/dashboard` — upcoming bookings, quick stats
- `/artist/earnings` — earnings breakdown
- `/artist/schedule` — calendar view
- `/artist/agreements` — session agreement page (UI only)

### Billing / Subscriptions
- Stripe subscription checkout at `/owner/settings/billing`
- Plans: Solo ($49), Studio ($79), Pro ($129)
- Customer portal for plan changes + cancellation
- Webhook handles subscription lifecycle (created, updated, deleted, payment failed)
- Blocked studios redirected to `/pricing`

### Auth
- Owner + Artist roles, separate dashboards
- Supabase Auth with email/password
- Password reset at `/auth/reset-password`
- Layout-level auth guards on all protected routes

### Security
- All admin mutations use `createAdminClient()` (service role) — never anon key
- Studio isolation enforced on every server action
- Image upload file-type verification (magic bytes, not just extension)
- Rate limiting on all public AI and booking endpoints
- IP-based rate limiting (in-process, upgradeable to Upstash Redis)

---

## 2. Missing / Incomplete Features

### Partially Built
| Feature | Status | Gap |
|---|---|---|
| Blacklist | Page exists | No enforcement at booking time |
| Waitlist | Page + table exist | No booking-cap logic, no auto-promote |
| Session Agreements | Artist page exists | Not linked to bookings |
| Remainder payment | Not built | No "collect balance" UI |
| Flash → Deposit timing | Bug | Flash marked booked before deposit paid |
| Consent form minor flow | Partial | Age check field exists, legal minor template missing |

### Not Built
| Feature | Priority |
|---|---|
| Studio Knowledge Base | P0 — in progress |
| Client ID photo verification | P1 |
| Wildcard subdomain routing (`studio.inkbook.tech`) | P1 |
| 1% transaction fee (Stripe application fee) | P1 |
| State-specific consent templates | P1 |
| Advanced revenue analytics (charts, MRR trend) | P2 |
| In-platform client messaging | P2 |
| Compliance audit log | P2 |
| Multi-studio per owner | P3 |

---

## 3. Database Schema Summary

| Table | Purpose |
|---|---|
| `studios` | Studio profile, subdomain, branding, Stripe subscription, deposit settings |
| `artists` | Artist profile, styles, minimum rate, linked to studio + auth user |
| `clients` | Client records per studio (name, email, phone) |
| `bookings` | Appointment records — status, deposit, date/time, artist, client |
| `deposits` | Legacy deposit records (pre-deposit_payments) |
| `deposit_payments` | Owner-initiated deposit payment requests (current flow) |
| `consent_forms` | Signed consent forms linked to bookings |
| `consultations` | AI consultation submissions — full intake + AI analysis + pipeline status |
| `custom_requests` | Design brief submissions — quote/deposit lifecycle |
| `flash_designs` | Artist flash gallery — price, availability, booked state |
| `portfolio_photos` | Artist portfolio images |
| `artist_invites` | Pending artist invitations (token + expiry) |
| `session_agreements` | Per-session scope agreements (stub) |
| `blacklist` | Blocked client records per studio |
| `waitlist` | Waitlist entries per studio |
| `sms_tracking` | SMS delivery log |

### RLS Pattern
Every table uses Row Level Security. Server actions bypass RLS via service role client (`createAdminClient`). PostgREST queries from clients use anon/user JWT with RLS enforced. Helper functions `my_studio_id()`, `my_artist_id()`, `my_artist_studio_id()` resolve the authenticated user's context.

---

## 4. API Summary

### Public (no auth required)
| Route | Method | Description |
|---|---|---|
| `/api/bookings` | POST | Create booking from public booking flow |
| `/api/consent-forms` | POST | Submit consent form |
| `/api/consent-forms/standalone` | POST | Standalone consent (no booking) |
| `/api/custom-requests` | POST | Submit custom design request (rate limited: 5/min) |
| `/api/custom-requests/[id]/deposit` | POST | Create Stripe checkout for custom request deposit (rate limited: 3/min) |
| `/api/ai/consultation-questions` | POST | Generate follow-up questions (rate limited: 20/min) |
| `/api/ai/style-detect` | POST | Detect tattoo style (rate limited: 20/min) |
| `/api/ai/quote-generate` | POST | Generate price quote (rate limited: 20/min) |
| `/api/booking-confirmation` | GET | Booking confirmation page data |
| `/api/send-sms` | POST | Internal SMS send |

### Owner/Artist authenticated
| Route | Method | Description |
|---|---|---|
| `/api/custom-requests/[id]/quote` | POST | Send quote on custom request |
| `/api/custom-requests/[id]/decline` | POST | Decline custom request |
| `/api/bookings/[bookingId]` | GET/PATCH | Single booking detail + status update |

### Stripe webhooks
| Route | Purpose |
|---|---|
| `/api/stripe/webhook` | Deposit payments (Branch A: owner-initiated, B: custom request, C: legacy) |
| `/api/billing/webhook` | Subscription lifecycle |

### Cron (CRON_SECRET header required)
| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/sms-reminders` | Daily 9am | Send 48hr + day-of reminders |
| `/api/cron/no-show` | Daily 11pm | Auto-mark no-shows, retain deposit |

---

## 5. Deployment Checklist

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY` (live key for production)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` (from `/api/billing/webhook` endpoint)
- [ ] `STRIPE_DEPOSIT_WEBHOOK_SECRET` (from `/api/stripe/webhook` endpoint)
- [ ] `NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID`
- [ ] `NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID`
- [ ] `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `RESEND_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `CRON_SECRET`
- [ ] `NEXT_PUBLIC_APP_URL`

### Database
- [ ] All 17 migrations applied (`supabase db push` or SQL Editor)
- [ ] RLS verified: all tables show `rowsecurity = true`
- [ ] Storage buckets created: `portfolio`, `studios`, `custom-requests`

### Stripe
- [ ] 3 subscription products created (Solo, Studio, Pro)
- [ ] 2 webhook endpoints registered (billing + deposit)
- [ ] Webhook events correctly scoped (see DEPLOY.md)

### Vercel
- [ ] All env vars set in Vercel dashboard
- [ ] Cron jobs configured in `vercel.json`
- [ ] Build succeeds: `npm run build`

---

## 6. Beta Launch Checklist

### Pre-launch
- [ ] Run `node --env-file .env.local scripts/verify-migrations.mjs` — all green
- [ ] End-to-end test: complete AI consultation → quote → book → pay deposit
- [ ] End-to-end test: custom request → owner quotes → client pays deposit
- [ ] End-to-end test: artist invited → accepts → uploads portfolio + flash
- [ ] Stripe test card `4242 4242 4242 4242` works for deposit and subscription
- [ ] SMS reminder received on test phone number
- [ ] Consent form submits and appears in owner dashboard

### Studio onboarding (first 3 studios)
- [ ] Owner registers and selects a plan
- [ ] Studio subdomain configured
- [ ] Brand colors + logo uploaded
- [ ] At least one artist invited and active
- [ ] Test booking attempted by external person (not the owner)
- [ ] Owner confirms they received deposit notification

### Known issues to monitor in beta
- Flash non-repeatable designs: marked booked on form submit, not on deposit payment
- Waitlist: no auto-promote logic — manage manually until Phase 2
- Blacklist: no enforcement at booking — block manually until Phase 2
- localStorage draft in consultation form retains PII until page reload

---

*Full deployment guide: see DEPLOY.md*
