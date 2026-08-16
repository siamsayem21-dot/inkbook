"use client";

import { useState, useTransition } from "react";
import { saveAvailability } from "@/app/(artist)/artist/schedule/actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function fmt12h(h: number) {
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

type SlotKey = string; // `${day}-${hour}`

interface Props {
  artistId: string;
  initial: SlotKey[];
}

export default function ScheduleCalendar({ artistId, initial }: Props) {
  const [available, setAvailable] = useState<Set<SlotKey>>(new Set(initial));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(day: number, hour: number) {
    const key: SlotKey = `${day}-${hour}`;
    setAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const slots = Array.from(available).map((k) => {
        const [d, h] = k.split("-").map(Number);
        return { day_of_week: d, hour: h };
      });
      const result = await saveAvailability({ artistId, slots });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-sm text-zinc-500">
          Click a slot to mark it <span className="text-violet-600 font-medium">available</span> (violet) or unavailable.
        </p>
        <div className="ml-auto flex items-center gap-3">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {saved && <span className="text-xs text-emerald-600">Saved ✓</span>}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full font-bold transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save availability"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6 overflow-x-auto">
        <div className="grid grid-cols-8 gap-1 min-w-[640px]">
          <div />
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-zinc-500 font-medium pb-2">{d}</div>
          ))}
          {HOURS.map((hour) => (
            <>
              <div key={`lbl-${hour}`} className="text-xs text-zinc-400 pr-2 pt-1.5">{fmt12h(hour)}</div>
              {DAYS.map((_, day) => {
                const key: SlotKey = `${day}-${hour}`;
                const isAvail = available.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggle(day, hour)}
                    title={`${DAYS[day]} ${fmt12h(hour)} — click to ${isAvail ? "remove" : "mark"} available`}
                    className={`h-8 rounded border transition-colors ${
                      isAvail
                        ? "bg-violet-50 border-violet-300 hover:bg-violet-100"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        Hours shown: 9am – 6pm. Availability is used to let clients see your open slots.
      </p>
    </div>
  );
}
