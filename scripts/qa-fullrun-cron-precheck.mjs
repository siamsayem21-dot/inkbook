import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const today = new Date().toISOString().split("T")[0];
const now = new Date();

console.log("=== cancel-expired: pending_deposit AND deposit_expires_at < now ===");
{
  const { data, count } = await sb.from("bookings").select("id, studio_id, deposit_expires_at", { count: "exact" }).eq("status", "pending_deposit").lt("deposit_expires_at", now.toISOString());
  console.log("count:", count, data?.map(d=>d.id));
}

console.log("=== no-show: confirmed AND date < today ===");
{
  const { data, count } = await sb.from("bookings").select("id, studio_id, date", { count: "exact" }).eq("status", "confirmed").not("date","is",null).lt("date", today);
  console.log("count:", count, data?.map(d=>({id:d.id, date:d.date, studio: d.studio_id})));
}

console.log("=== payment-reminders pass1: pending_deposit, reminder not sent, expires within 25h ===");
{
  const windowEnd = new Date(now.getTime() + 25*60*60*1000);
  const { data, count } = await sb.from("bookings").select("id, studio_id, deposit_expires_at", { count: "exact" }).eq("status","pending_deposit").eq("deposit_reminder_sent", false).gte("deposit_expires_at", now.toISOString()).lte("deposit_expires_at", windowEnd.toISOString());
  console.log("count:", count, data?.map(d=>d.id));
}

console.log("=== payment-reminders pass2: confirmed/completed, remainder not collected/reminded, date<today ===");
{
  const { data, count } = await sb.from("bookings").select("id, studio_id, date", { count: "exact" }).in("status",["confirmed","completed"]).eq("remainder_collected", false).eq("remainder_reminder_sent", false).not("date","is",null).lt("date", today);
  console.log("count:", count, data?.map(d=>d.id));
}

console.log("=== review-requests: completed, review_requested_at null, completed_at <= 14d ago ===");
{
  const fourteenDaysAgo = new Date(Date.now() - 14*24*60*60*1000).toISOString();
  const { data, count } = await sb.from("bookings").select("id, studio_id, completed_at", { count: "exact" }).eq("status","completed").is("review_requested_at", null).lte("completed_at", fourteenDaysAgo);
  console.log("count:", count, data?.map(d=>d.id));
}

console.log("=== waitlist-notify: any un-notified waitlist entry ===");
{
  const { data, count } = await sb.from("waitlist").select("id, artist_id, client_id, added_at", { count: "exact" }).eq("notified", false);
  console.log("count:", count, data?.map(d=>d.id));
}

console.log("=== sms-reminders: confirmed, deposit_paid, date within -1..+3 day window ===");
{
  const rangeStart = new Date(now); rangeStart.setUTCDate(rangeStart.getUTCDate()-1);
  const rangeEnd = new Date(now); rangeEnd.setUTCDate(rangeEnd.getUTCDate()+3);
  const { data, count, error } = await sb.from("bookings").select("id, studio_id, date", { count: "exact" }).eq("status","confirmed").eq("deposit_paid", true).not("date","is",null).gte("date", rangeStart.toISOString().split("T")[0]).lte("date", rangeEnd.toISOString().split("T")[0]);
  console.log("count (pre-column-check, ignores flag columns):", count, error?.message, data?.map(d=>d.id));
}
