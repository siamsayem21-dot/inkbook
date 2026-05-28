import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("studios")
    .select("id, name, subdomain, logo_url, state, deposit_amount_cents")
    .eq("subdomain", slug)
    .single();

  if (error || !data) return NextResponse.json({ studio: null }, { status: 404 });
  return NextResponse.json({ studio: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, name, subdomain } = body as { userId?: string; name?: string; subdomain?: string };

  if (!userId || !name || !subdomain) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain format" }, { status: 400 });
  }

  const supabase = adminClient();

  const { data, error } = await supabase
    .from("studios")
    .insert({ name, subdomain, owner_id: userId })
    .select("id, name, subdomain")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "That subdomain is already taken." : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ studio: data }, { status: 201 });
}
