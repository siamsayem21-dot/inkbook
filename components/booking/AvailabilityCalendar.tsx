"use client";

import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AvailabilityCalendar() {
  const [selected, setSelected] = useState<string | null>(null);

  // Placeholder — populate from API based on artist availability
  const days = Array.from({ length: 28 }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, "0")}`,
    available: Math.random() > 0.4,
    dayOfWeek: DAYS[i % 7],
  }));

  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-zinc-800 inline-block" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-zinc-300 inline-block" /> Booked</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-zinc-500 pb-1">{d}</div>
        ))}
        {days.map((day) => (
          <button
            key={day.date}
            disabled={!day.available}
            onClick={() => setSelected(day.date)}
            className={`aspect-square rounded-lg text-xs font-medium transition-colors ${
              selected === day.date
                ? "bg-zinc-900 text-white"
                : day.available
                ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                : "bg-zinc-50 text-zinc-300 cursor-not-allowed"
            }`}
          >
            {parseInt(day.date.split("-")[2])}
          </button>
        ))}
      </div>
    </div>
  );
}
