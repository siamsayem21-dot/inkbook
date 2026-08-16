import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isValidIanaTimezone } from "@/lib/timezone";

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
  // This creates a studio owned by a given user and force-confirms that
  // user's email — both privileged actions — so the caller must be
  // authenticated as that same user. The signUp() call on the register
  // page (app/(auth)/register/page.tsx) establishes a session cookie via
  // the browser client's SSR cookie sync, which this request-scoped server
  // client reads here. Never trust a client-supplied user id for this.
  const serverClient = createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, subdomain, timezone } = body as { name?: string; subdomain?: string; timezone?: string };

  if (!name || !subdomain) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain format" }, { status: 400 });
  }

  // Optional — omitting it leaves the column's own DEFAULT 'UTC' in place.
  // If provided, it must be a real IANA identifier; never silently swapped
  // to something else on a bad value.
  if (timezone !== undefined && !isValidIanaTimezone(timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const supabase = adminClient();

  const { data, error } = await supabase
    .from("studios")
    .insert({ name, subdomain, owner_id: user.id, ...(timezone ? { timezone } : {}) })
    .select("id, name, subdomain")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "That subdomain is already taken." : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Auto-confirm the owner's email so they can sign in with password immediately
  // (Supabase blocks signInWithPassword until email_confirm is true)
  await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });

  return NextResponse.json({ studio: data }, { status: 201 });
}
