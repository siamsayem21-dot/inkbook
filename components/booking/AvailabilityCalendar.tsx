"use client";

import { useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function AvailabilityCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = [
    year,
    String(month + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const [selected, setSelected] = useState<string | null>(null);

  const monthName = today.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-white">
          {monthName} {year}
        </h3>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-700 inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gold inline-block" />
            Selected
          </span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-white/30 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const dateStr = [
            year,
            String(month + 1).padStart(2, "0"),
            String(dayNum).padStart(2, "0"),
          ].join("-");
          const dayOfWeek = new Date(year, month, dayNum).getDay();
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          // Placeholder: Mon–Sat available, Sun closed, past dates unavailable
          const available = !isPast && dayOfWeek !== 0;
          const isSelected = selected === dateStr;

          return (
            <button
              key={dateStr}
              disabled={!available}
              onClick={() => setSelected(isSelected ? null : dateStr)}
              title={available ? dateStr : undefined}
              className={[
                "aspect-square rounded-lg text-xs font-medium transition-all",
                isSelected
                  ? "bg-gold text-black font-bold scale-105"
                  : isToday && available
                  ? "bg-zinc-700 text-white ring-1 ring-gold/50"
                  : available
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "text-white/15 cursor-not-allowed",
              ].join(" ")}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-5 flex items-center gap-2 text-sm text-gold bg-gold/10 border border-gold/20 rounded-lg px-4 py-2.5">
          <span>✓</span>
          <span>
            {new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            — proceed to booking to select a time
          </span>
        </div>
      )}
    </div>
  );
}
