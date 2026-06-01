export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import ScheduleCalendar from "@/components/artist/ScheduleCalendar";

const ARTIST_ID = "fa2900bc-f613-4f75-8f64-e1e0d7e32a79";

export default async function SchedulePage() {
  const supabase = createAdminClient();

  const { data: availRaw } = await supabase
    .from("artist_availability" as never)
    .select("day_of_week, hour")
    .eq("artist_id" as never, ARTIST_ID);

  const initialSlots = ((availRaw ?? []) as { day_of_week: number; hour: number }[])
    .map((r) => `${r.day_of_week}-${r.hour}`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Schedule</h1>
      <ScheduleCalendar artistId={ARTIST_ID} initial={initialSlots} />
    </div>
  );
}
