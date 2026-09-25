import { NextResponse } from "next/server";
import pkg from "@/package.json";

export const runtime = "nodejs";

// Diagnostic endpoint. Intentionally unauthenticated, static-ish info only —
// no DB/Stripe/Twilio access, matches the low-sensitivity posture of
// /api/health's uptime-monitor precedent.
export async function GET() {
  return NextResponse.json({
    version: pkg.version,
    date: new Date().toISOString(),
  });
}
