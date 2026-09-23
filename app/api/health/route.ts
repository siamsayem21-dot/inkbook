import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Uptime-monitor endpoint. Intentionally unauthenticated so external
// monitors (Better Uptime, UptimeRobot, etc.) can hit it without
// credentials. Scope is honest: confirms the app is up and the DB is
// reachable, and reports which critical env vars are configured — it does
// NOT make live Stripe/Twilio API calls, so a broken Stripe/Twilio
// credential will not show up here.
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "TWILIO_ACCOUNT_SID",
] as const;

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(`health:${getClientIp(request)}`, 60);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfter);

  const env = Object.fromEntries(
    REQUIRED_ENV_VARS.map((key) => [key, process.env[key] ? "configured" : "missing"])
  );

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("studios").select("id").limit(1);

    if (error) {
      console.error("[health] db check failed", error.message);
      return NextResponse.json(
        { status: "error", db: "error", env, timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      db: "ok",
      env,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] unexpected error", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { status: "error", db: "error", env, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
