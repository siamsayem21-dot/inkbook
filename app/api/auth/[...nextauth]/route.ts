import { NextRequest, NextResponse } from "next/server";

// Legacy route kept for compatibility — the active auth callback is at /auth/callback
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Forward to the real callback handler
  const callbackUrl = new URL("/auth/callback", origin);
  if (code) callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("next", next);

  return NextResponse.redirect(callbackUrl);
}
