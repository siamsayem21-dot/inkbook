"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PERIODS: { value: string; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "all",   label: "All time" },
];

// Deliberately just two real, fully schema-backed options for now — both are
// plain date-range math over existing timestamp columns, nothing invented.
// Structured as a list so more (e.g. "Last 30 days", "This quarter") can be
// added later without changing how the page reads the ?period= param.
export default function PeriodControl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("period") ?? "month";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "month") {
      params.delete("period");
    } else {
      params.set("period", value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex items-center gap-0.5 bg-zinc-100 rounded-lg p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => select(p.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            current === p.value
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
