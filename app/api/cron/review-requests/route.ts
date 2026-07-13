import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSmsMessage, trySendSms } from "@/lib/twilio/client";
import { sendReviewRequestEmail } from "@/lib/email";

export const runtime = "nodejs";

// Runs once daily. Invites a client to leave a review 14 days after their
// session was completed (Phase C Feature 5 — deliberately delayed, not
// fired alongside the aftercare notification in markCompleted(), so the
// ask lands after the tattoo has had time to heal). Deduped with a one-shot
// timestamp on `bookings` (review_requested_at), exactly like
// deposit_reminder_sent/remainder_reminder_sent in cron/payment-reminders.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error: fetchError } = await supabase
    .from("bookings")
    .select("id, studio_id, artist_id, client_id")
    .eq("status", "completed")
    .is("review_requested_at", null)
    .lte("completed_at", fourteenDaysAgo);

  if (fetchError) {
    console.error("[cron/review-requests] fetch failed:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let requestsSent = 0;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  for (const row of (rows ?? []) as { id: string; studio_id: string; artist_id: string; client_id: string }[]) {
    // Skip (and mark handled) if a review already exists for this booking —
    // asking again would be pointless, and this also self-heals a booking
    // whose review_requested_at somehow never got set.
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", row.id)
      .maybeSingle();

    if (existingReview) {
      await supabase
        .from("bookings")
        .update({ review_requested_at: new Date().toISOString() } as never)
        .eq("id", row.id);
      continue;
    }

    const [{ data: studioData }, { data: artistData }, { data: clientData }] = await Promise.all([
      supabase.from("studios").select("name, subdomain").eq("id", row.studio_id).maybeSingle(),
      supabase.from("artists").select("name").eq("id", row.artist_id).maybeSingle(),
      supabase.from("clients").select("full_name, email, phone").eq("id", row.client_id).maybeSingle(),
    ]);

    const studio = studioData as { name: string; subdomain: string } | null;
    const artistName = (artistData as { name: string } | null)?.name ?? "your artist";
    const client = clientData as { full_name: string; email: string; phone: string } | null;

    if (!studio) continue;

    const reviewUrl = `${baseUrl}/portal/${studio.subdomain}/bookings/${row.id}/review`;

    if (client?.phone) {
      void trySendSms(client.phone, buildSmsMessage("review_request", studio.name));
    }
    if (client?.email) {
      void sendReviewRequestEmail({
        to: client.email,
        clientName: client.full_name,
        studioName: studio.name,
        artistName,
        reviewUrl,
      });
    }

    await supabase
      .from("bookings")
      .update({ review_requested_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    requestsSent++;
  }

  return NextResponse.json({ requestsSent });
}
