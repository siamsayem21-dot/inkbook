export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getStudioId } from "@/lib/auth/config";
import { getStudioKnowledge } from "@/lib/studio-knowledge";
import KnowledgeClient from "./KnowledgeClient";

export default async function KnowledgePage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const entries = await getStudioKnowledge(studioId);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Studio Knowledge Base</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Everything you write here is injected into the AI during every client consultation —
          style detection, follow-up questions, and quote generation all use this context.
          Mark entries as <span className="text-green-400">Public</span> to display them as FAQs on your booking page.
        </p>
      </div>

      {entries.length === 0 && (
        <div className="bg-[#c9a84c]/[0.04] border border-[#c9a84c]/20 rounded-xl px-5 py-5 space-y-3">
          <p className="text-sm font-semibold text-[#c9a84c]">Getting started</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Add a few entries to make your AI consultations accurate for your specific studio.
            Recommended first entries:
          </p>
          <ul className="text-sm text-zinc-400 space-y-1 list-none">
            <li><span className="text-zinc-200">1.</span> <strong className="text-zinc-300">Pricing Context</strong> — your hourly rate, minimums, and what drives pricing at your studio</li>
            <li><span className="text-zinc-200">2.</span> <strong className="text-zinc-300">Style &amp; Specialties</strong> — what styles you do and don't take</li>
            <li><span className="text-zinc-200">3.</span> <strong className="text-zinc-300">Policy</strong> — your cancellation, deposit, and no-show rules</li>
          </ul>
        </div>
      )}

      <KnowledgeClient initialEntries={entries} />
    </div>
  );
}
