"use client";

import { useState } from "react";
import ActiveProjectCard from "./ActiveProjectCard";
import CompletedProjectCard from "./CompletedProjectCard";
import type { ActiveTattooProject, CompletedTattooProject } from "../types";

type Tab = "all" | "active" | "completed";

interface Props {
  active: ActiveTattooProject[];
  completed: CompletedTattooProject[];
}

export default function MyTattoosBoard({ active, completed }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: active.length + completed.length },
    { key: "active", label: "Active", count: active.length },
    { key: "completed", label: "Completed", count: completed.length },
  ];

  const showActive = tab === "all" || tab === "active";
  const showCompleted = tab === "all" || tab === "completed";

  return (
    <div className="space-y-8">
      <div className="inline-flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t.label} <span className={tab === t.key ? "text-violet-600" : "text-zinc-400"}>{t.count}</span>
          </button>
        ))}
      </div>

      {showActive && (
        <section>
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Active Projects</h2>
          {active.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">No active tattoo projects right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((project) => (
                <ActiveProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      )}

      {showCompleted && (
        <section>
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Completed / Past Tattoos</h2>
          {completed.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">No completed tattoos yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {completed.map((project) => (
                <CompletedProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
