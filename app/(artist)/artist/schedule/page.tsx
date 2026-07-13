export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/config";
import ScheduleCalendar from "@/components/artist/ScheduleCalendar";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: artistRaw } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const artist = artistRaw as { id: string } | null;
  if (!artist) redirect("/artist/dashboard");

  const { data: availRaw } = await supabase
    .from("artist_availability" as never)
    .select("day_of_week, hour")
    .eq("artist_id" as never, artist.id);

  const initialSlots = ((availRaw ?? []) as { day_of_week: number; hour: number }[])
    .map((r) => `${r.day_of_week}-${r.hour}`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Schedule</h1>
      <ScheduleCalendar artistId={artist.id} initial={initialSlots} />
    </div>
  );
}
