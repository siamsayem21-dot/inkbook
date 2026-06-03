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
  const { quote_amount, quote_message, deposit_amount } = body as {
    quote_amount?: number;
    quote_message?: string;
    deposit_amount?: number;
  };

  if (!quote_amount || quote_amount <= 0) {
    return NextResponse.json({ error: "quote_amount is required and must be positive" }, { status: 400 });
  }
  if (!deposit_amount || deposit_amount <= 0) {
    return NextResponse.json({ error: "deposit_amount is required and must be positive" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the request belongs to an artist or studio this user has access to
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

  if (cr.status !== "pending") {
    return NextResponse.json({ error: "Request is not in pending state" }, { status: 409 });
  }

  // Verify this user is the artist or studio owner
  const [{ data: artistRow }, { data: studioRow }] = await Promise.all([
    supabase.from("artists").select("id, name, studio_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("studios").select("id, name, subdomain").eq("owner_id", user.id).maybeSingle(),
  ]);

  const artist = artistRow as { id: string; name: string; studio_id: string } | null;
  const studio = studioRow as { id: string; name: string; subdomain: string } | null;

  const isArtist = artist && artist.studio_id === cr.studio_id;
  const isOwner = studio && studio.id === cr.studio_id;

  if (!isArtist && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studioName = studio?.name ?? "";
  const studioSlug = studio?.subdomain ?? "";

  // If owner is quoting, look up studio name/slug
  let resolvedStudioName = studioName;
  let resolvedStudioSlug = studioSlug;
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
      status: "quoted",
      quote_amount,
      quote_message: quote_message ?? null,
      deposit_amount,
    } as never)
    .eq("id", params.id);

  if (error) {
    console.error("[custom-requests/quote] update error:", error.message);
    return NextResponse.json({ error: "Failed to save quote" }, { status: 500 });
  }

  void sendCustomRequestQuoteEmail({
    to: cr.client_email,
    clientName: cr.client_name,
    studioName: resolvedStudioName,
    studioSlug: resolvedStudioSlug,
    requestId: params.id,
    quoteAmount: quote_amount,
    quoteMessage: quote_message ?? "",
    depositAmount: deposit_amount,
  });

  return NextResponse.json({ success: true });
}
