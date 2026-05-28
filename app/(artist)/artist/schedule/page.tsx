import ScheduleCalendar from "@/components/artist/ScheduleCalendar";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <button className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full">
          Set availability
        </button>
      </div>
      <ScheduleCalendar />
    </div>
  );
}
