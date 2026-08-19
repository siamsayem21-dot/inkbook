import * as Sentry from "@sentry/nextjs";
import { scrubSensitiveData } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Conservative on purpose: InkBook handles client PII (names, emails,
  // phone, ID photos), consent-form data, and Stripe payment flows.
  // sendDefaultPii would attach request headers/cookies/IP by default --
  // explicitly off rather than trusting the SDK default.
  sendDefaultPii: false,

  tracesSampleRate: 0.1,

  // No-op with SENTRY_DSN unset -- Sentry.init() itself becomes a disabled
  // client, so every capture call elsewhere in the app is already a safe
  // no-op without any extra guard code.
  enabled: !!process.env.SENTRY_DSN,

  beforeSend: scrubSensitiveData,
});
