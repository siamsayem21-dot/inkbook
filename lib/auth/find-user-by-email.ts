// Extracted from app/artist/accept/[token]/actions.ts (2026-08-30) so the
// same hardened lookup can also run server-side in page.tsx, to decide
// BEFORE rendering whether an invited email already has an InkBook
// account — needed so the invite-accept UI never shows misleading
// "Set a password" fields for someone who already has a real password.
//
// Uses the Admin API's list-users endpoint (no per-email lookup endpoint
// exists in this Supabase version) rather than @supabase/supabase-js's
// createClient(), which is why this needs its own bounded fetch() — see
// the .trim() below for why that matters (2026-08-30 P1 fix history).
export async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()}/auth/v1/admin/users?page=1&per_page=1000`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ id: string; email: string }> };
    return data.users?.find((u) => u.email === email) ?? null;
  } catch {
    // A lookup failure here must never crash the invite page itself — it
    // just falls back to the "new user" UI (password fields shown), which
    // is exactly today's existing behavior and still correct/safe: if the
    // account actually does exist, acceptInvite()'s own createUser-then-
    // catch-email_exists fallback (unchanged) still handles it correctly.
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
