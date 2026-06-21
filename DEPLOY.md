# InkBook — Production Deployment Guide

## Prerequisites

- Node.js 18+
- A Supabase project (free tier sufficient for launch)
- A Stripe account (live mode for production)
- A Twilio account with a phone number
- A Resend account for transactional email
- An Anthropic account for AI features
- A Vercel account for hosting

---

## 1. Environment Variables

Copy `.env.local.example` to `.env.local` for local dev. In production, set these in Vercel's dashboard under **Settings → Environment Variables**.

### Required

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → `/api/billing/webhook` endpoint |
| `STRIPE_DEPOSIT_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → `/api/stripe/webhook` endpoint |
| `NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID` | Stripe → Products → Solo ($49/mo) → Price ID |
| `NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID` | Stripe → Products → Studio ($79/mo) → Price ID |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Stripe → Products → Pro ($129/mo) → Price ID |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info |
| `TWILIO_PHONE_NUMBER` | Twilio Console → Phone Numbers (format: +15551234567) |
| `RESEND_API_KEY` | Resend → API Keys |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys |
| `CRON_SECRET` | Generate with: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://www.inkbook.tech` (or your domain) |

---

## 2. Database Setup

All migrations live in `supabase/migrations/` and must be run **in order**.

### Apply migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Push all pending migrations
supabase db push
```

### Migration order

| File | Description |
|---|---|
| `20260527000000_initial_schema.sql` | Core tables: studios, artists, clients, bookings, deposits, consent_forms, waitlist, blacklist |
| `20260527000001_rls.sql` | Row-level security policies and helper functions |
| `20260527000002_storage.sql` | Storage buckets: portfolio, studios |
| `20260529000000_sms_tracking.sql` | SMS delivery tracking columns |
| `20260529000001_standalone_consent.sql` | Standalone consent form flow |
| `20260531000000_billing_columns.sql` | Stripe subscription columns on studios |
| `20260618000000_consultations.sql` | AI consultation wizard table |
| `20260619000000_consultation_quotes.sql` | Quote fields on consultations |
| `20260619000002_pipeline_stages.sql` | Pipeline status enum + indexes |
| `20260619000003_stripe_deposit_payments.sql` | deposit_payments table for owner-initiated deposits |
| `20260620000000_rls_gaps.sql` | Additional RLS policies |
| `20260621000000_artist_invites.sql` | Artist invite flow |
| `20260621000001_consultation_booking_link.sql` | Link consultations → bookings |
| `20260621000002_consultation_booking_unique.sql` | Unique constraint on booking_id |
| `20260622000000_custom_requests.sql` | Custom request flow + storage bucket |
| `20260622000001_flash_designs.sql` | Flash designs table |
| `20260622000002_studio_branding.sql` | Brand color + font columns on studios |

### Verify migrations applied

```sql
-- Run in Supabase SQL editor
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Expect: artists, blacklist, bookings, clients, consent_forms, consultations,
--         custom_requests, deposit_payments, deposits, flash_designs,
--         portfolio_photos, session_agreements, studios, waitlist
```

---

## 3. Stripe Setup

### Create products

In Stripe Dashboard → Products → Add product:

1. **InkBook Solo** — $49/mo recurring → copy the Price ID → `NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID`
2. **InkBook Studio** — $79/mo recurring → copy the Price ID → `NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID`
3. **InkBook Pro** — $129/mo recurring → copy the Price ID → `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`

### Register two webhook endpoints

Go to Stripe → Developers → Webhooks → Add endpoint:

**Endpoint 1 — Subscription lifecycle**
- URL: `https://www.inkbook.tech/api/billing/webhook`
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

**Endpoint 2 — Deposit payments**
- URL: `https://www.inkbook.tech/api/stripe/webhook`
- Events: `checkout.session.completed`
- Copy signing secret → `STRIPE_DEPOSIT_WEBHOOK_SECRET`

---

## 4. Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (first time)
vercel --prod

# Set environment variables (or use Vercel dashboard)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... repeat for each env var
```

### Cron jobs

Add to `vercel.json` (already present if the file exists):

```json
{
  "crons": [
    { "path": "/api/cron/sms-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/no-show",       "schedule": "0 23 * * *" }
  ]
}
```

The `CRON_SECRET` env var is checked by both cron routes. Set the same value in Vercel env vars and in your `vercel.json` cron configuration header via `Authorization: Bearer $CRON_SECRET`.

---

## 5. AI Setup

The AI features require `ANTHROPIC_API_KEY`. They degrade gracefully — if the key is missing, fallback responses are used and the flow continues without error.

- `/api/ai/consultation-questions` — generates intake questions (5 calls per consultation)
- `/api/ai/style-detect` — classifies tattoo style from description
- `/api/ai/quote-generate` — estimates price range and sessions

Model used: `claude-haiku-4-5-20251001` (fast, low cost).

---

## 6. Twilio SMS Setup

1. Create a Twilio account, verify a phone number
2. Set `TWILIO_PHONE_NUMBER` in E.164 format: `+15551234567`
3. SMS is sent for: booking confirmed, 48-hour reminder, day-of reminder, no-show notification
4. SMS fails gracefully — a failed send never blocks a booking

---

## 7. Studio Onboarding

When a new studio signs up:

1. **Owner registers** at `/register` (owner role set automatically)
2. **Owner completes billing** at `/owner/settings/billing` — chooses a plan
3. **Owner configures studio** at `/owner/settings/studio`:
   - Studio name, address, state
   - Upload logo
   - Set brand colors + font
4. **Owner invites artists** at `/owner/artists` — sends email invite with 7-day token
5. **Artist accepts invite** at `/artist/accept/[token]` — sets password, completes profile
6. **Studio goes live** at `/book/[subdomain]`

### Subdomain routing

The white-label booking page is served from `inkbook.tech/book/[subdomain]`. Configure a wildcard Vercel domain (`*.inkbook.tech`) if you want studios to get `studioname.inkbook.tech` URLs (requires DNS + Vercel Pro).

For launch, `inkbook.tech/book/[subdomain]` works without wildcard DNS.

---

## 8. Backup & Recovery

### Database backups

Supabase Pro includes daily automated backups with 7-day retention. For the free tier, run manual exports:

```bash
# Export full database
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### Critical tables (back up frequently)

- `studios` — customer data
- `bookings` + `deposits` + `deposit_payments` — revenue data
- `clients` — PII (handle per CCPA/PIPEDA)
- `consent_forms` — legal documents (retain 7 years)

### Recovery procedure

```bash
# Restore from dump
psql "$SUPABASE_DB_URL" < backup-20260622.sql
```

Contact Supabase support for point-in-time recovery on Pro plan.

---

## 9. Local Development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local
# Fill in values (Supabase local or remote, Stripe test keys)

# Run dev server
npm run dev
# → http://localhost:3000

# Apply migrations to local Supabase
supabase start          # starts local Supabase
supabase db push        # applies migrations
```

### Test accounts

Create test accounts via `/register`. Use Stripe test cards for payments:
- `4242 4242 4242 4242` — success
- `4000 0000 0000 0002` — declined

---

## 10. Production Readiness Checklist

- [ ] All env vars set in Vercel
- [ ] All 17 migrations applied (`supabase db push`)
- [ ] Two Stripe webhook endpoints registered with correct event sets
- [ ] Stripe products created, Price IDs configured
- [ ] Cron jobs configured in `vercel.json`
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Supabase RLS enabled (verify: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'`)
- [ ] Test booking flow end-to-end with Stripe test card
- [ ] Test AI consultation (requires `ANTHROPIC_API_KEY`)
- [ ] Test SMS reminder (requires Twilio)
- [ ] Database backups enabled
