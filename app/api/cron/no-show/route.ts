import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendNoShowEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0];

  // Find all confirmed bookings whose date has already passed.
  // .not("date", "is", null) excludes awaiting_schedule bookings — those have
  // a null date and a far-future deposit_expires_at sentinel. Without this guard,
  // the .lt("date", today) filter would never match null dates anyway in
  // PostgreSQL (NULL comparisons are always false), but the explicit guard makes
  // the intent clear and protects against any future query changes.
  const { data: overdueBookingsRaw, error: fetchError } = await supabase
    .from("bookings")
    .select("id, client_id, studio_id, deposit_amount_cents")
    .eq("status", "confirmed")
    .not("date", "is", null)
    .lt("date", today);

  if (fetchError) {
    console.error("[cron/no-show] fetch failed:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const overdueBookings = (overdueBookingsRaw ?? []) as Array<{
    id: string;
    client_id: string;
    studio_id: string;
    deposit_amount_cents: number;
  }>;
  const ids = overdueBookings.map((b) => b.id);

  if (ids.length === 0) {
    console.log("[cron/no-show] no overdue confirmed bookings found");
    return NextResponse.json({ updated: 0, bookings: [] });
  }

  // Mark as no_show — deposit is kept automatically since no Stripe refund is issued
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "no_show", deposit_kept: true } as never)
    .in("id", ids);

  if (updateError) {
    console.error("[cron/no-show] update failed:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[cron/no-show] marked ${ids.length} booking(s) as no_show:`, ids);

  // Notify each affected client — failures here are logged, not thrown, so a
  // notification issue never rolls back or blocks the status update above.
  const clientIds = Array.from(new Set(overdueBookings.map((b) => b.client_id)));
  const studioIds = Array.from(new Set(overdueBookings.map((b) => b.studio_id)));

  const [{ data: clientsRaw }, { data: studiosRaw }] = await Promise.all([
    supabase.from("clients").select("id, full_name, email, phone").in("id", clientIds),
    supabase.from("studios").select("id, name").in("id", studioIds),
  ]);

  const clientsById = new Map(
    ((clientsRaw ?? []) as { id: string; full_name: string; email: string; phone: string }[]).map((c) => [c.id, c])
  );
  const studioNameById = new Map(((studiosRaw ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

  for (const booking of overdueBookings) {
    const client = clientsById.get(booking.client_id);
    const studioName = studioNameById.get(booking.studio_id) ?? "the studio";
    if (client?.phone) void trySendSms(client.phone, buildSmsMessage("no_show", studioName));
    if (client?.email) {
      void sendNoShowEmail({
        to: client.email,
        clientName: client.full_name,
        studioName,
        depositAmountCents: booking.deposit_amount_cents,
      });
    }
  }

  return NextResponse.json({ updated: ids.length, bookings: ids });
}
