"use client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm"];

export default function ScheduleCalendar() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 overflow-x-auto">
      <div className="grid grid-cols-8 gap-1 min-w-[640px]">
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-zinc-400 font-medium pb-2">{d}</div>
        ))}
        {HOURS.map((hour) => (
          <>
            <div key={hour} className="text-xs text-zinc-500 pr-2 pt-1">{hour}</div>
            {DAYS.map((d) => (
              <div
                key={`${d}-${hour}`}
                className="h-8 rounded border border-zinc-800 hover:border-zinc-600 cursor-pointer transition-colors"
              />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
