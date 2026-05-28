# InkBook — Project Bible

## What is InkBook?
White-label Tattoo Studio Management SaaS for USA/Canada market.
Studios get their own branded booking page. Clients think it's the studio's own website.
Example: bookings.inkandironstudio.com — actually running on InkBook platform.

## Tech Stack
- Frontend: Next.js 14 (App Router)
- Database: Supabase (PostgreSQL)
- Payments: Stripe
- SMS: Twilio
- Hosting: Vercel
- Styling: Tailwind CSS + shadcn/ui
- Language: TypeScript

## 3 User Types
1. OWNER — manages everything (studio, artists, revenue, settings)
2. ARTIST — sees own bookings, schedule, earnings, portfolio
3. CLIENT — books appointment, pays deposit, signs consent form (no account needed)

## Pricing Plans
- Solo: $49/mo (1 artist)
- Studio: $79/mo (2-5 artists)
- Pro: $129/mo (6+ artists)
- + 1% transaction fee on all bookings

## Core Features (MVP)
1. White-label booking page per studio (custom subdomain)
2. Artist portfolio + availability calendar
3. Stripe deposit on booking (mandatory, auto-kept on no-show)
4. Auto-cancel booking if deposit not paid within 24 hours
5. Digital consent form (state-specific, minor age verification)
6. SMS reminders via Twilio (48hr + day-of)
7. Owner dashboard (revenue, bookings, all artists)
8. Artist dashboard (schedule, earnings)
9. Client blacklist (owner/artist can block problem clients)
10. Session-by-session digital agreement (scope creep protection)
11. Remainder payment collection before session ends
12. Client profile (full name + ID photo required to book)
13. Style filter on artist profile (artist sets accepted styles)
14. Waitlist system (booking cap per month)

## Database Tables Needed
- studios
- artists
- clients
- bookings
- deposits
- consent_forms
- blacklist
- session_agreements
- waitlist

## Business Rules
- Deposit is MANDATORY — cannot be turned off
- Deposit auto-kept if client no-shows
- Booking auto-cancelled if deposit not paid in 24hrs
- Owner sets minimum rate per artist — artist cannot go below it
- All client communication goes through platform (no personal numbers)
- Client must provide full name + photo to complete booking

## Target Market
- USA + Canada
- 21,000+ tattoo studios
- Artists currently using: Instagram DM + Venmo + paper forms

## Competition
- Venue.ink (missing: CRM, reminders, owner controls, blacklist, payment protection)
- Nothing else serious

## Build Priority
Week 1: Next.js setup + Supabase schema + Auth (3 user types)
Week 2: White-label booking page + Stripe deposit
Week 3: Consent form + SMS reminders (Twilio)
Week 4: Owner dashboard + Artist dashboard + Deploy to Vercel
Month 2: Client blacklist + CRM + Session agreement + Waitlist
Month 3: Compliance log + ID verification + Advanced analytics

## Revenue Goal
- Month 3: 30 studios = $4,000 MRR
- Month 6: 100 studios = $14,000 MRR
- Month 12: 300 studios = $42,000 MRR

## Why This Product Exists (Market Research)

### Real Pain Points Found (Reddit r/TattooArtists Research)

**Top Pain Points by Evidence:**
1. Last-minute cancellations — 843 upvotes
2. Pricing wars / no professional image — 1,624 upvotes
3. Payment not received after tattoo done — 108 upvotes
4. Artists chronically undercharge themselves — 92 upvotes
5. Multi-channel communication chaos (DM+email+calls) — 81 upvotes
6. Difficult client behaviors — 81 upvotes
7. Chronic reschedulers — 77 upvotes
8. Client over-familiarity / friend price exploitation — 56 upvotes
9. No client blacklist system — 111 comments
10. Consultation no-shows — 96 comments

**Key Behavioral Patterns:**
- Artists currently use: Instagram DM + Venmo + paper forms + JotForm ($300/yr) + Square
- New artists don't enforce deposits because they feel guilty — platform must enforce automatically
- Clients contact artists across 3-4 channels simultaneously
- Scope creep is universal — clients change design mid-project, ignore original quote
- Artists have no written policy to point to — platform must generate it automatically
- Solo female artists fear unknown clients — ID verification needed

**Competitor Gap Analysis — Venue.ink:**
- Has: Basic booking + intake forms + client info
- Missing: Customizable SMS reminders, repeat client CRM, session agreements, client blacklist, payment protection after tattoo, owner dashboard, earnings transparency
- InkBook advantage: Studio-owner focused vs Venue.ink artist-focused

**Why Users Will Pay:**
- Already paying $300/yr JotForm + Square fees
- One prevented no-show pays for 1 month of InkBook
- Artists losing money every week without this system
