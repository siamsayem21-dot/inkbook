import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Found during Phase 5 cron precheck: 4 bookings + clients left over from this
// session's own Phase 4 mobile-viewport job, not cleaned up as previously claimed.
const bookingIds = [
  "a8db8186-5c3e-42c5-a15c-c516612e8072", "4953c7c3-55b8-44c2-86db-751754d8d21c",
  "0c660a1c-7609-4552-8023-39cc8673b3fb", "3cc485db-3b8e-42bf-aca4-2efd153f7696",
];
const clientIds = [
  "e667d1e7-e99c-4bc0-af2b-9f0804ddb5d4", "77401bbd-853b-4517-8233-1409a54e1c0c",
  "71a5a904-39a2-43bb-9de2-030f044b6699", "6dbd64b4-a30d-482b-ba97-3895d0f25bc1",
];
const { error: be } = await sb.from("bookings").delete().in("id", bookingIds);
console.log("bookings delete:", be?.message ?? "ok");
const { error: ce } = await sb.from("clients").delete().in("id", clientIds);
console.log("clients delete:", ce?.message ?? "ok");

const { count } = await sb.from("bookings").select("id", { count: "exact", head: true }).in("id", bookingIds);
console.log("remaining bookings after delete:", count);
