import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Required for instrumentation.ts (server/edge Sentry init) to be picked
  // up on Next.js 14.x -- stable by default starting in Next.js 15, but
  // still gated here. Harmless no-op if the running Next version no longer
  // needs it.
  experimental: {
    instrumentationHook: true,
  },
};

// withSentryConfig only affects the build (source map upload, tunneling
// route, etc.) -- it's safe to apply unconditionally. Every credential it
// reads (org/project/authToken) comes from env vars and is undefined-safe:
// with SENTRY_AUTH_TOKEN unset, the source-map upload step is skipped
// automatically (a build-time warning, never a failure) rather than
// requiring a real token here.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print Sentry's own build logs when actually configured -- keeps
  // ordinary local/CI builds (no Sentry env vars) quiet.
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of source maps for better stack traces, then strip
  // the extra debug ids Sentry needs for the upload out of the client
  // bundle afterward so they don't ship to users.
  widenClientFileUpload: true,
  hideSourceMaps: true,

  // Routes browser-side Sentry requests through the app's own domain
  // (avoids ad-blockers dropping error reports). Adds one small Next.js
  // rewrite; no effect when Sentry is unconfigured.
  tunnelRoute: "/monitoring",

  webpack: {
    // Automatic Vercel Cron Monitor instrumentation is not used here --
    // this project's crons already have their own idempotency/
    // observability via CRON_SECRET-gated routes; adding Sentry cron
    // monitoring is a separate, deliberate decision, not a default to opt
    // into silently.
    automaticVercelMonitors: false,

    // Strips the SDK's own internal logger statements from the shipped
    // bundle -- smaller client bundle, no effect on error reporting.
    treeshake: { removeDebugLogging: true },
  },
});
