"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors that escape every other error boundary (a crash in the
// root layout itself). Next.js requires this to render its own <html>/
// <body> since it replaces the root layout when triggered -- deliberately
// minimal, no app fonts/styles, since those are exactly what might have
// failed to load.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0A0A0A", color: "#F5F5F5", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#A1A1AA" }}>
            We&apos;ve been notified and are looking into it. Please try refreshing the page.
          </p>
        </div>
      </body>
    </html>
  );
}
