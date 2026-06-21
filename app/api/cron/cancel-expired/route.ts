import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // cancel_expired_bookings() was defined in migration 20260527000000_initial_schema.sql.
  // It cancels all bookings where status = 'pending_deposit' AND deposit_expires_at < NOW().
  // Returns the count of rows updated.
  const { data, error } = await supabase.rpc("cancel_expired_bookings");

  if (error) {
    console.error("[cron/cancel-expired]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cancelled = (data as number) ?? 0;
  console.log(`[cron/cancel-expired] cancelled ${cancelled} booking(s)`);
  return NextResponse.json({ cancelled });
}
