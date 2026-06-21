# InkBook

White-label tattoo studio management SaaS for USA & Canada.

Studios get their own branded booking page at `inkbook.tech/book/[subdomain]`. Clients think it's the studio's own website.

## Features

- **White-label booking** — `/book/[studio]` with custom brand colors + font
- **AI Consultation** — 5-step wizard with style detection + quote generation
- **Custom Requests** — client submits design brief → owner quotes → client pays deposit
- **Flash Designs** — artists list pre-drawn tattoos for direct booking
- **Stripe deposits** — mandatory at booking, auto-kept on no-show
- **SMS reminders** — 48hr + day-of via Twilio
- **Digital consent forms** — state-specific, minor age verification
- **Lead pipeline** — Kanban view of consultation → quoted → booked flow
- **Team management** — owner invites artists via email token
- **Client CRM** — blacklist, repeat client tracking
- **Owner dashboard** — revenue, bookings, all artists

## Stack

- Next.js 14 (App Router), TypeScript
- Supabase (PostgreSQL + RLS + Storage)
- Stripe (subscriptions + deposits)
- Twilio (SMS)
- Resend (transactional email)
- Anthropic Claude (AI consultation, style detection, quoting)
- Vercel (hosting + cron)
- Tailwind CSS + shadcn/ui

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# Fill in .env.local (see DEPLOY.md for details)
npm run dev
```

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for the complete guide covering:
- Environment variables
- Database migrations (17 total)
- Stripe webhook setup
- AI, SMS, and email configuration
- Studio onboarding flow
- Backup & recovery
