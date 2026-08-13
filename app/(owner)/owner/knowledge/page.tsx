export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import { getAllStudioKnowledge } from "@/lib/studio-knowledge";
import KnowledgeClient from "./KnowledgeClient";

export default async function KnowledgePage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const entries = await getAllStudioKnowledge(studioId);

  return (
    <div className="-m-4 -mt-16 md:-m-8 min-h-[calc(100vh-3rem)] md:min-h-screen" style={{ background: "#FAF9FC" }}>
      <div className="p-4 pt-16 md:p-8 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Studio Knowledge Base</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Everything you write here is injected into the AI during every client consultation —
            style detection, follow-up questions, and quote generation all use this context.
            Mark entries as <span className="text-emerald-600 font-medium">Public</span> to display them as FAQs on your booking page.
          </p>
        </div>

        {entries.length === 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-5 space-y-3">
            <p className="text-sm font-semibold text-violet-700">Getting started</p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Add a few entries to make your AI consultations accurate for your specific studio.
              Recommended first entries:
            </p>
            <ul className="text-sm text-zinc-600 space-y-1 list-none">
              <li><span className="text-zinc-900">1.</span> <strong className="text-zinc-800">Pricing Context</strong> — your hourly rate, minimums, and what drives pricing at your studio</li>
              <li><span className="text-zinc-900">2.</span> <strong className="text-zinc-800">Style &amp; Specialties</strong> — what styles you do and don&apos;t take</li>
              <li><span className="text-zinc-900">3.</span> <strong className="text-zinc-800">Policy</strong> — your cancellation, deposit, and no-show rules</li>
            </ul>
          </div>
        )}

        <KnowledgeClient initialEntries={entries} />
      </div>
    </div>
  );
}
