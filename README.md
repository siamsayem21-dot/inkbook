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

## Testing

Four independent suites:

```bash
npm test             # Vitest — API routes + business logic, fully mocked, offline (~2s)
npm run test:watch   # same, watch mode
npm run test:coverage  # same, with v8 coverage → coverage/
npm run test:ct      # Playwright Component Testing — booking wizard UI, real browser, mocked fetch/actions
npm run test:db      # Vitest — RLS/FK/constraint/cascade verification against a REAL local Supabase
npm run test:e2e     # Playwright — full owner workflow, real browser + real backend
npm run test:all     # everything, in order (needs Docker running locally — see below)
```

| Suite | Backend | Needs Docker locally? |
|---|---|---|
| `test` (unit) | mocked Supabase/Stripe/Twilio | No |
| `test:ct` | mocked `fetch` + server actions | No |
| `test:db` | **real** local Supabase via `supabase start` | Yes |
| `test:e2e` | **real** local Supabase + real `next dev` (+ real Stripe test-mode Checkout if keys are set) | Yes |

`test:db` and `test:e2e` need a local Supabase instance:
```bash
npx supabase start          # applies supabase/migrations automatically
npx supabase status -o env  # copy API_URL/ANON_KEY/SERVICE_ROLE_KEY/DB_URL and export as
                             # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
                             # SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_URL
npm run test:db
npm run test:e2e            # optionally export STRIPE_SECRET_KEY (test) +
                             # NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (test) first to also
                             # exercise the live deposit-payment/consent/dashboard steps
```
Without Docker, these two suites aren't runnable locally — they run automatically in CI (`.github/workflows/test.yml`), which provisions Supabase fresh on every run via `supabase/setup-cli`.

- `tests/unit/` — one file per API route or lib module. `tests/mocks/supabase.ts` provides a chainable fake query builder (`sb.queueFrom(table, data, error)` queues the next result per table, FIFO).
- `tests/ct/` — mounts client wizard components (`ConsultationForm`, `CustomRequestForm`) directly in a browser via Vite; `./actions` (the "use server" modules) is aliased to `tests/ct/mocks/shared-actions.mock.ts` in `playwright-ct.config.ts`, and AI fetch calls are intercepted with `page.route`.
- `tests/db/` — RLS isolation (cross-studio), FK/unique/check constraints, `ON DELETE CASCADE`/`RESTRICT` behavior. Ground truth is `supabase/migrations/*.sql` — update `tests/db/schema-integrity.test.ts`'s tables when the schema changes.
- `tests/e2e/` — one long scenario: register a studio → sign out/in → invite + onboard an artist → submit an AI consultation as a client → owner generates a quote and books it → (if Stripe test keys are configured) client pays the deposit on real Stripe Checkout → signs the consent form → owner dashboard shows the confirmed booking.

A pre-commit hook (Husky, `.husky/pre-commit`) runs `npm test` only — fast enough not to interrupt normal commits. The full matrix (including `test:db`/`test:e2e`) runs in CI on every push/PR.

### Coverage by Phase 1 feature + dashboard

```bash
npm run test:coverage
node scripts/coverage-by-feature.mjs        # → reports/coverage-by-feature.json
node scripts/generate-test-dashboard.mjs    # → reports/dashboard.html (reads all 4 suites' JSON reports if present)
```
"Phase 1 completion %" is defined precisely in the generated report: the share of the 17 feature areas in `PHASE1.md` with at least one passing automated test (unit, component, or E2E) touching them. Backend line-coverage % only applies to `app/api/**` and `lib/**` — UI-only areas show "tested by" badges instead of a percentage.

### CI (`.github/workflows/test.yml`)

Runs on every push and every PR to `main`: `fast` (typecheck + unit + component), `db-and-e2e` (ephemeral Supabase + DB verification + full E2E), then `dashboard` (aggregates both into one downloadable HTML artifact, runs even if a suite failed).

**To actually block deployment on failure**, two one-time manual steps (I didn't make these changes myself — they affect the whole repo/team):
1. **GitHub → Settings → Branches → Branch protection rule on `main`**: require the `fast` and `db-and-e2e` status checks to pass before merging.
2. **Vercel → Project Settings → Git**: confirm the Production Branch is `main` (so nothing reaches production without going through the required PR checks above). If Vercel is currently set to auto-deploy every branch/preview, leave previews as-is — only the production-branch setting matters for gating.

Optional: add `STRIPE_TEST_SECRET_KEY` / `STRIPE_TEST_PUBLISHABLE_KEY` (test-mode Stripe keys) as GitHub Actions secrets to unlock the live deposit-payment portion of the E2E suite — without them those specific steps are skipped, not failed.

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for the complete guide covering:
- Environment variables
- Database migrations (17 total)
- Stripe webhook setup
- AI, SMS, and email configuration
- Studio onboarding flow
- Backup & recovery
