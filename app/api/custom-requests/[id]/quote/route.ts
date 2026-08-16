import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { sendCustomRequestQuoteEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { quote_amount, quote_message, deposit_amount, artist_id: bodyArtistId } = body as {
    quote_amount?: number;
    quote_message?: string;
    deposit_amount?: number;
    artist_id?: string;
  };

  // Financial validation — both values required and logically consistent.
  if (!quote_amount || quote_amount <= 0) {
    return NextResponse.json({ error: "quote_amount is required and must be positive" }, { status: 400 });
  }
  if (!deposit_amount || deposit_amount <= 0) {
    return NextResponse.json({ error: "deposit_amount is required and must be positive" }, { status: 400 });
  }
  if (deposit_amount >= quote_amount) {
    return NextResponse.json(
      { error: "deposit_amount must be less than quote_amount (the total session price)" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: reqData } = await supabase
    .from("custom_requests")
    .select("id, studio_id, artist_id, client_name, client_email, status")
    .eq("id", params.id)
    .single();

  if (!reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const cr = reqData as {
    id: string;
    studio_id: string;
    artist_id: string | null;
    client_name: string;
    client_email: string;
    status: string;
  };

  if (!["pending", "quoted"].includes(cr.status)) {
    return NextResponse.json({ error: "Request cannot be quoted in its current state" }, { status: 409 });
  }

  // Verify this user is the artist or studio owner. Scoped to cr.studio_id
  // (the request's own studio), not just user.id — an owner with more than
  // one studio row would otherwise make .maybeSingle() match multiple rows,
  // which returns null (silently, error discarded by the destructure) and
  // was incorrectly rejecting every real multi-studio owner with 403.
  const [{ data: artistRow }, { data: studioRow }] = await Promise.all([
    supabase.from("artists").select("id, name, studio_id").eq("user_id", user.id).eq("studio_id", cr.studio_id).maybeSingle(),
    supabase.from("studios").select("id, name, subdomain").eq("owner_id", user.id).eq("id", cr.studio_id).maybeSingle(),
  ]);

  const artist = artistRow as { id: string; name: string; studio_id: string } | null;
  const studio = studioRow as { id: string; name: string; subdomain: string } | null;

  // An artist may only act on their own studio's requests that are assigned
  // to them or still unassigned — never a request already assigned to a
  // *different* artist at the same studio. Previously this only checked
  // studio membership, so any artist at a studio could quote/claim a
  // colleague's assigned request. The owner has no such restriction.
  const isArtist =
    artist !== null &&
    artist.studio_id === cr.studio_id &&
    (cr.artist_id === null || cr.artist_id === artist.id);
  const isOwner  = studio !== null && studio.id === cr.studio_id;

  if (!isArtist && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve artist_id for the quote.
  // If the logged-in user IS an artist, auto-assign them if the request has no artist yet.
  // If the logged-in user is an owner, they can pass artist_id in the body to assign one.
  // The booking created at deposit time requires an artist — enforce it here.
  let resolvedArtistId = cr.artist_id;

  if (isArtist && resolvedArtistId === null) {
    resolvedArtistId = artist!.id;
  } else if (isOwner && bodyArtistId && !resolvedArtistId) {
    // Validate the supplied artist_id belongs to this studio
    const { data: targetArtist } = await supabase
      .from("artists")
      .select("id")
      .eq("id", bodyArtistId)
      .eq("studio_id", cr.studio_id)
      .maybeSingle();

    if (!targetArtist) {
      return NextResponse.json({ error: "artist_id does not belong to this studio" }, { status: 400 });
    }
    resolvedArtistId = bodyArtistId;
  }

  if (!resolvedArtistId) {
    return NextResponse.json(
      { error: "An artist must be assigned to this request before sending a quote" },
      { status: 400 }
    );
  }

  // Owner-set floor per artist — "Owner sets minimum rate per artist,
  // artist cannot go below it" (CLAUDE.md). Applies regardless of whether
  // the artist or the studio owner submitted this quote.
  const { data: rateArtistRow } = await supabase
    .from("artists")
    .select("name, minimum_rate_cents")
    .eq("id", resolvedArtistId)
    .maybeSingle();
  const rateArtist = rateArtistRow as { name: string; minimum_rate_cents: number } | null;
  if (rateArtist && Math.round(quote_amount * 100) < rateArtist.minimum_rate_cents) {
    return NextResponse.json(
      {
        error: `Quote must be at least $${(rateArtist.minimum_rate_cents / 100).toFixed(2)} — ${rateArtist.name}'s minimum rate.`,
      },
      { status: 400 }
    );
  }

  // Resolve studio name/subdomain for the quote email
  let resolvedStudioName = studio?.name ?? "";
  let resolvedStudioSlug = studio?.subdomain ?? "";
  if (!resolvedStudioName || !resolvedStudioSlug) {
    const { data: s } = await supabase
      .from("studios")
      .select("name, subdomain")
      .eq("id", cr.studio_id)
      .single();
    if (s) {
      const sRow = s as { name: string; subdomain: string };
      resolvedStudioName = sRow.name;
      resolvedStudioSlug = sRow.subdomain;
    }
  }

  const { error } = await supabase
    .from("custom_requests")
    .update({
      status:        "quoted",
      quote_amount,
      quote_message: quote_message ?? null,
      deposit_amount,
      artist_note:   quote_message ?? null,
      artist_id:     resolvedArtistId,
    } as never)
    .eq("id", params.id);

  if (error) {
    console.error("[custom-requests/quote] update error:", error.message);
    return NextResponse.json({ error: "Failed to save quote" }, { status: 500 });
  }

  void sendCustomRequestQuoteEmail({
    to:            cr.client_email,
    clientName:    cr.client_name,
    studioName:    resolvedStudioName,
    studioSlug:    resolvedStudioSlug,
    requestId:     params.id,
    quoteAmount:   quote_amount,
    quoteMessage:  quote_message ?? "",
    depositAmount: deposit_amount,
  });

  return NextResponse.json({ success: true });
}
