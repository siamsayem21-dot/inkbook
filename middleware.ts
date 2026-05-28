import { NextResponse, type NextRequest } from "next/server";

// Auth enforcement is disabled until Supabase env keys are configured.
// See .env.local.example for required variables.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
