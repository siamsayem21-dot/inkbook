"use client";

import { useState, useTransition } from "react";
import { addUnavailableDate, removeUnavailableDate } from "@/app/(artist)/artist/schedule/actions";

interface Props {
  artistId: string;
  initial: string[]; // YYYY-MM-DD, ascending
}

function fmtDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

export default function UnavailableDates({ artistId, initial }: Props) {
  const [dates, setDates] = useState<string[]>(initial);
  const [newDate, setNewDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const todayStr = new Date().toISOString().split("T")[0];

  function handleAdd() {
    setError(null);
    if (!newDate) return;
    if (dates.includes(newDate)) {
      setNewDate("");
      return;
    }
    startTransition(async () => {
      const result = await addUnavailableDate(artistId, newDate);
      if (result.error) {
        setError(result.error);
      } else {
        setDates((prev) => [...prev, newDate].sort());
        setNewDate("");
      }
    });
  }

  function handleRemove(date: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeUnavailableDate(artistId, date);
      if (result.error) setError(result.error);
      else setDates((prev) => prev.filter((d) => d !== date));
    });
  }

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-zinc-900">Days Off</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Clients won&apos;t be able to book you on these dates.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={newDate}
          min={todayStr}
          onChange={(e) => setNewDate(e.target.value)}
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-violet-400"
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !newDate}
          className="text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full font-bold transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Add day off"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {dates.length === 0 ? (
        <p className="text-xs text-zinc-400">No days off marked.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {dates.map((date) => (
            <li
              key={date}
              className="flex items-center gap-2 text-xs bg-zinc-50 border border-zinc-200 rounded-full pl-3 pr-1.5 py-1.5"
            >
              <span className="text-zinc-700">{fmtDateLabel(date)}</span>
              <button
                onClick={() => handleRemove(date)}
                disabled={isPending}
                aria-label={`Remove ${fmtDateLabel(date)}`}
                className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
