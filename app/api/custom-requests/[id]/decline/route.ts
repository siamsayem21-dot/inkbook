import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: reqData } = await supabase
    .from("custom_requests" as never)
    .select("id, studio_id, status")
    .eq("id", params.id)
    .single();

  if (!reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const cr = reqData as { id: string; studio_id: string; status: string };

  if (!["pending", "quoted"].includes(cr.status)) {
    return NextResponse.json({ error: "Request cannot be declined in its current state" }, { status: 409 });
  }

  // Verify this user belongs to the studio
  const [{ data: artistRow }, { data: studioRow }] = await Promise.all([
    supabase.from("artists").select("studio_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("studios").select("id").eq("owner_id", user.id).maybeSingle(),
  ]);

  const isArtist = (artistRow as { studio_id: string } | null)?.studio_id === cr.studio_id;
  const isOwner = (studioRow as { id: string } | null)?.id === cr.studio_id;

  if (!isArtist && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("custom_requests" as never)
    .update({ status: "declined" })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Failed to decline request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
