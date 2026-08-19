import * as Sentry from "@sentry/nextjs";

// Runs in the Edge runtime -- covers middleware.ts. Same conservative PII
// posture as sentry.server.config.ts; no-op with SENTRY_DSN unset.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,
});
