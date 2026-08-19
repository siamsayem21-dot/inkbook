// Next.js's built-in instrumentation hook -- runs once when the server (or
// edge runtime) starts. Loads the matching Sentry init file for whichever
// runtime is actually running; harmless no-op when SENTRY_DSN is unset (see
// sentry.server.config.ts / sentry.edge.config.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports errors Next.js's own instrumentation surfaces for server
// components/actions that error before a response is sent (e.g. cases
// error.tsx boundaries don't catch) -- only active once Sentry.init() above
// has actually run; a no-op call otherwise.
export async function onRequestError(...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>) {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
