import * as Sentry from "@sentry/nextjs";
import { scrubSensitiveData } from "@/lib/sentry-scrub";

// Deliberately using sentry.client.config.ts, not the newer
// instrumentation-client.ts convention the SDK's build-time deprecation
// warning suggests -- confirmed Next.js 14.2.35 (this repo's version) has
// no built-in support for that file (it's a later-Next-version convention;
// searching next/dist for it turns up nothing). This file is still the
// SDK's own supported fallback via its webpack plugin and is what actually
// runs client-side init here. Revisit if/when this repo upgrades to a
// Next.js version that supports instrumentation-client.ts natively.
//
// Client-side DSN must be NEXT_PUBLIC_-prefixed to reach the browser bundle
// -- this is expected/safe: a DSN only allows *sending* events, it's not a
// read credential and isn't sensitive the way an auth token is.
//
// Deliberately conservative for V1: no Session Replay (it captures DOM/user
// interaction, a much bigger PII surface than InkBook needs for error
// monitoring) and no default PII (headers/cookies aren't relevant
// client-side, but keeping the posture explicit and consistent with the
// server/edge configs).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend: scrubSensitiveData,
});
