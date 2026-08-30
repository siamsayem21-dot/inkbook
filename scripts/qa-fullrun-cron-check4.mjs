import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ids = ['a8db8186-5c3e-42c5-a15c-c516612e8072','4953c7c3-55b8-44c2-86db-751754d8d21c','0c660a1c-7609-4552-8023-39cc8673b3fb','3cc485db-3b8e-42bf-aca4-2efd153f7696'];
const { data: bookings } = await sb.from("bookings").select("id, client_id, studio_id, status, deposit_expires_at, created_at").in("id", ids);
for (const b of bookings) {
  const { data: client } = await sb.from("clients").select("full_name, email, phone").eq("id", b.client_id).maybeSingle();
  const { data: studio } = await sb.from("studios").select("name, subdomain").eq("id", b.studio_id).maybeSingle();
  console.log(JSON.stringify({ id: b.id, created_at: b.created_at, expires: b.deposit_expires_at, client: client?.full_name, email: client?.email, phone: client?.phone, studio: studio?.name }));
}
