# InkBook

White-label tattoo studio management SaaS for USA & Canada.

- **Booking**: `/book/[studio-subdomain]` — white-label booking pages per studio
- **Payments**: Stripe deposits (mandatory, auto-kept on no-show)
- **SMS**: Twilio reminders (48hr + day-of)
- **Consent**: Digital forms with ID verification
- **Stack**: Next.js 14, Supabase, Stripe, Twilio, Vercel

## Dev

```bash
npm run dev
```

Requires `.env.local` — see `.env.local.example`.
