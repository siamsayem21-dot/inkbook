"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PIPELINE_STAGES } from "@/lib/pipeline";

export default function ConsultFilter() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const current     = searchParams.get("status") ?? "all";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const tabs = [
    { value: "all",   label: "All", color: "border-[#D4A853]/40 text-[#D4A853]" },
    ...PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.short, color: s.color })),
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => select(tab.value)}
          className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-wider font-medium transition-all whitespace-nowrap ${
            current === tab.value
              ? tab.color
              : "border-[#252525] text-zinc-600 hover:text-zinc-400"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
