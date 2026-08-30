import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: studios } = await sb.from("studios").select("id, name, subdomain, timezone").ilike("name", "%QA-SEED-FULLQA-20260829%");
console.log("STUDIOS:", JSON.stringify(studios, null, 2));
for (const s of studios ?? []) {
  const { data: artists } = await sb.from("artists").select("id, name, is_active, monthly_booking_cap").eq("studio_id", s.id);
  console.log("ARTISTS for", s.name, JSON.stringify(artists, null, 2));
  const { data: clients } = await sb.from("clients").select("id, full_name, email, phone").eq("studio_id", s.id);
  console.log("CLIENTS for", s.name, JSON.stringify(clients, null, 2));
  const { data: bookings } = await sb.from("bookings").select("id, status, date, artist_id, client_id, deposit_paid, deposit_expires_at").eq("studio_id", s.id);
  console.log("BOOKINGS for", s.name, JSON.stringify(bookings, null, 2));
}
