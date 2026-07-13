import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendWaitlistSlotOpenEmail } from "@/lib/email";
import { getArtistBookingCountForMonth } from "@/lib/waitlist";

export const runtime = "nodejs";

// Runs once daily. For each artist with waitlist entries, notifies the
// single oldest un-notified entry (FIFO by added_at) if the artist has
// dropped back under their monthly cap (Phase C Feature 6) — e.g. a
// cancellation or no-show freed a slot. Deliberately one notification per
// artist per run, not "notify everyone who now fits": avoids racing
// multiple notified clients against the same single opening.
// Deduped via waitlist.notified (existing column, one-shot — same shape as
// deposit_reminder_sent/review_requested_at from Features 3/5).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: artistRows, error: artistFetchError } = await supabase
    .from("artists")
    .select("id, name, studio_id, monthly_booking_cap")
    .eq("is_active", true);

  if (artistFetchError) {
    console.error("[cron/waitlist-notify] artist fetch failed:", artistFetchError.message);
    return NextResponse.json({ error: artistFetchError.message }, { status: 500 });
  }

  let notificationsSent = 0;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  for (const artist of (artistRows ?? []) as {
    id: string; name: string; studio_id: string; monthly_booking_cap: number;
  }[]) {
    const { data: waitingRows } = await supabase
      .from("waitlist")
      .select("id, client_id")
      .eq("artist_id", artist.id)
      .eq("notified", false)
      .order("added_at", { ascending: true })
      .limit(1);

    const entry = (waitingRows as { id: string; client_id: string }[] | null)?.[0];
    if (!entry) continue;

    const bookingsThisMonth = await getArtistBookingCountForMonth(supabase, artist.id, today);
    if (bookingsThisMonth >= artist.monthly_booking_cap) continue; // still at capacity

    const [{ data: clientData }, { data: studioData }] = await Promise.all([
      supabase.from("clients").select("full_name, email, phone").eq("id", entry.client_id).maybeSingle(),
      supabase.from("studios").select("name, subdomain").eq("id", artist.studio_id).maybeSingle(),
    ]);

    const client = clientData as { full_name: string; email: string; phone: string } | null;
    const studio = studioData as { name: string; subdomain: string } | null;
    if (!studio) continue;

    const bookUrl = `${baseUrl}/book/${studio.subdomain}/${artist.id}/book`;

    if (client?.phone) {
      void trySendSms(client.phone, buildSmsMessage("waitlist_slot_open", studio.name));
    }
    if (client?.email) {
      void sendWaitlistSlotOpenEmail({
        to: client.email,
        clientName: client.full_name,
        studioName: studio.name,
        artistName: artist.name,
        bookUrl,
      });
    }

    await supabase
      .from("waitlist")
      .update({ notified: true } as never)
      .eq("id", entry.id);
    notificationsSent++;
  }

  return NextResponse.json({ notificationsSent });
}
