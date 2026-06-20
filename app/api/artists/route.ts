import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studioId = searchParams.get("studioId");
  const style    = searchParams.get("style");

  const supabase = createAdminClient();

  let query = supabase
    .from("artists")
    .select("id, name, bio, styles, minimum_rate_cents, avatar_url")
    .eq("is_active", true);

  if (studioId) query = query.eq("studio_id", studioId);
  if (style)    query = query.contains("styles", [style]);

  const { data, error } = await query.order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ artists: data ?? [] });
}
