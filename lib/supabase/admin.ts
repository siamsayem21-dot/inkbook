import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { nodeRealtimeTransport } from "./realtime-transport";

// Service-role client — bypasses RLS. Only use in server-side code (API routes, server components).
// Never expose SUPABASE_SERVICE_ROLE_KEY to the client bundle.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: nodeRealtimeTransport },
      global: {
        // Disable Next.js fetch cache so server components always get fresh data
        fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
