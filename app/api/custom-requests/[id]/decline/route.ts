import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import { sendCustomRequestDeclinedEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { declined_reason } = body as { declined_reason?: string };

  const supabase = createAdminClient();

  const { data: reqData } = await supabase
    .from("custom_requests")
    .select("id, studio_id, client_name, client_email, status")
    .eq("id", params.id)
    .single();

  if (!reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const cr = reqData as {
    id: string;
    studio_id: string;
    client_name: string;
    client_email: string;
    status: string;
  };

  if (!["pending", "quoted"].includes(cr.status)) {
    return NextResponse.json({ error: "Request cannot be declined in its current state" }, { status: 409 });
  }

  // Verify this user belongs to the studio
  const [{ data: artistRow }, { data: studioRow }] = await Promise.all([
    supabase.from("artists").select("studio_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("studios").select("id, name, subdomain").eq("owner_id", user.id).maybeSingle(),
  ]);

  const isArtist = (artistRow as { studio_id: string } | null)?.studio_id === cr.studio_id;
  const ownerStudio = studioRow as { id: string; name: string; subdomain: string } | null;
  const isOwner = ownerStudio?.id === cr.studio_id;

  if (!isArtist && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("custom_requests")
    .update({
      status: "declined",
      declined_reason: declined_reason?.trim() || null,
    } as never)
    .eq("id", params.id);

  if (error) {
    console.error("[decline] update error:", error.message);
    return NextResponse.json({ error: "Failed to decline request" }, { status: 500 });
  }

  // Notify client
  let studioName = ownerStudio?.name ?? "";
  let studioSlug = ownerStudio?.subdomain ?? "";
  if (!studioName || !studioSlug) {
    const { data: s } = await supabase
      .from("studios").select("name, subdomain").eq("id", cr.studio_id).single();
    if (s) {
      const row = s as { name: string; subdomain: string };
      studioName = row.name;
      studioSlug = row.subdomain;
    }
  }

  void sendCustomRequestDeclinedEmail({
    to:            cr.client_email,
    clientName:    cr.client_name,
    studioName,
    studioSlug,
    declinedReason: declined_reason?.trim(),
  });

  return NextResponse.json({ success: true });
}
