import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Supabase redirects here after email confirmation, password reset, and magic links.
// Must exchange the one-time code for a session before redirecting the user.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  // artist_id is embedded in the redirectTo URL when an owner invites an artist
  const artistId = searchParams.get("artist_id");
  const defaultNext = type === "recovery" ? "/reset-password" : "/dashboard";
  const next = searchParams.get("next") ?? defaultNext;

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if this is an artist accepting an invite
      const { data: { user } } = await supabase.auth.getUser();

      if (user && artistId) {
        // Use the embedded artist_id for precise row matching
        const admin = adminClient();
        const { data: artistRow } = await admin
          .from("artists")
          .select("id")
          .eq("id", artistId)
          .is("user_id", null)
          .maybeSingle();

        if (artistRow) {
          await admin
            .from("artists")
            .update({ user_id: user.id, is_active: true })
            .eq("id", artistRow.id);

          return NextResponse.redirect(new URL("/artist/dashboard", origin));
        }
      } else if (user?.email && !artistId) {
        // Fallback: check by email in case artist_id wasn't in the URL
        const admin = adminClient();
        const { data: artistRow } = await admin
          .from("artists")
          .select("id")
          .eq("email", user.email)
          .is("user_id", null)
          .maybeSingle();

        if (artistRow) {
          await admin
            .from("artists")
            .update({ user_id: user.id, is_active: true })
            .eq("id", artistRow.id);

          return NextResponse.redirect(new URL("/artist/dashboard", origin));
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }

    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  }

  return NextResponse.redirect(new URL("/login?error=link_expired", origin));
}
