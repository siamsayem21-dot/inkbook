// TEMPORARY -- Sentry production verification route. Created and removed
// within the same session; not meant to exist in the repo history beyond
// the verification commit. Triggers exactly one harmless, synthetic error
// so its arrival in Sentry (event id, environment tag, PII scrubbing) can
// be confirmed against the real Production DSN. No real user/client data
// is used anywhere in this file -- every "sensitive-looking" field below
// is a hardcoded fake string included specifically to prove the
// lib/sentry-scrub.ts beforeSend hook activates on it.
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  const eventId = Sentry.captureException(
    new Error("InkBook Sentry V1 verification — safe to ignore, this is an intentional synthetic test error"),
    {
      extra: {
        purpose: "sentry-production-verification",
        // Deliberately fake, sensitive-shaped values -- proves the scrub
        // hook filters them before the event leaves the server. Real code
        // never sends anything like this.
        password: "FAKE-should-be-filtered-by-scrub-hook",
        stripeToken: "FAKE-should-be-filtered-by-scrub-hook",
        cardNumber: "FAKE-should-be-filtered-by-scrub-hook",
      },
    }
  );

  const flushed = await Sentry.flush(5000);

  const result = {
    eventId,
    flushed,
    environment: process.env.VERCEL_ENV ?? "unknown",
    dsnConfigured: !!process.env.SENTRY_DSN,
  };
  console.log("[sentry-verify-tmp]", JSON.stringify(result));

  return NextResponse.json(result);
}
