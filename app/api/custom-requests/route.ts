import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCustomRequestReceivedEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(`custom-requests:${getClientIp(request)}`, 5, 60_000);
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfter);

  const body = await request.json();

  const {
    studio_id,
    artist_id,
    client_name,
    client_email,
    client_phone,
    design_description,
    placement,
    size,
    budget_range,
    preferred_dates,
    reference_photos,
  } = body as {
    studio_id?: string;
    artist_id?: string | null;
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    design_description?: string;
    placement?: string;
    size?: string;
    budget_range?: string;
    preferred_dates?: string;
    reference_photos?: string[];
  };

  if (!studio_id || !client_name || !client_email || !client_phone || !design_description || !placement || !size || !budget_range) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify studio exists
  const { data: studio } = await supabase
    .from("studios")
    .select("id, name, subdomain")
    .eq("id", studio_id)
    .single();

  if (!studio) return NextResponse.json({ error: "Studio not found" }, { status: 404 });

  const studioRow = studio as { id: string; name: string; subdomain: string };

  // Block blacklisted clients — same check used in /api/bookings
  const [{ data: blockedByEmail }, { data: blockedByPhone }] = await Promise.all([
    supabase
      .from("blacklist")
      .select("id")
      .eq("studio_id", studioRow.id)
      .eq("client_email", String(client_email))
      .limit(1)
      .maybeSingle(),
    supabase
      .from("blacklist")
      .select("id")
      .eq("studio_id", studioRow.id)
      .eq("client_phone", String(client_phone))
      .limit(1)
      .maybeSingle(),
  ]);
  if (blockedByEmail !== null || blockedByPhone !== null) {
    return NextResponse.json(
      { error: "Request cannot be submitted. Please contact the studio directly." },
      { status: 403 }
    );
  }

  const { data: req, error } = await supabase
    .from("custom_requests")
    .insert({
      studio_id,
      artist_id: artist_id ?? null,
      client_name,
      client_email,
      client_phone,
      design_description,
      placement,
      size,
      budget_range,
      preferred_dates,
      reference_photos: reference_photos ?? [],
      status: "pending",
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("[custom-requests] insert error:", error.message);
    return NextResponse.json({ error: "Failed to save request" }, { status: 500 });
  }

  const newRequest = req as { id: string };

  // Notify artist (or studio owner if no specific artist)
  let artistEmail: string | null = null;
  let artistName: string | null = null;

  if (artist_id) {
    const { data: artistData } = await supabase
      .from("artists")
      .select("name, email")
      .eq("id", artist_id)
      .single();
    if (artistData) {
      const a = artistData as { name: string; email: string };
      artistEmail = a.email;
      artistName = a.name;
    }
  } else {
    // Fall back to studio owner
    const { data: ownerData } = await supabase
      .from("studios")
      .select("owner_id")
      .eq("id", studio_id)
      .single();
    if (ownerData) {
      const { data: userEmail } = await supabase.auth.admin.getUserById(
        (ownerData as { owner_id: string }).owner_id
      );
      artistEmail = userEmail?.user?.email ?? null;
      artistName = "Studio Owner";
    }
  }

  if (artistEmail) {
    void sendCustomRequestReceivedEmail({
      to: artistEmail,
      artistName: artistName ?? "Artist",
      clientName: client_name,
      studioName: studioRow.name,
      requestId: newRequest.id,
      designDescription: design_description,
      placement,
      size,
      budgetRange: budget_range,
    });
  }

  return NextResponse.json({ id: newRequest.id }, { status: 201 });
}
