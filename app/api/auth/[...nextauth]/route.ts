import { NextRequest, NextResponse } from "next/server";

// Supabase Auth handles authentication via @supabase/ssr
// This route handles OAuth callbacks from Supabase
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // Exchange code for session via Supabase
    // const supabase = createServerClient(...)
    // await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url));
}
