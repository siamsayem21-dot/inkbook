"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import SectionShell from "./SectionShell";
import EmptyState from "./EmptyState";

export interface FaqItem {
  id: string;
  title: string;
  content: string;
}

interface Props {
  items: FaqItem[];
}

// Real public studio_knowledge entries (category "faq", is_public && is_active)
// — the same data source the public /book/[studio] page's own FAQ section
// reads from (lib/studio-knowledge.ts's getPublicFaq()). Nothing hard-coded.
export default function FaqAccordion({ items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <SectionShell id="faq" icon={HelpCircle} eyebrow="Questions" title="Frequently Asked Questions">
      {items.length === 0 ? (
        <EmptyState message="No FAQs published yet." />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-zinc-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-800">{item.title}</span>
                  <ChevronDown size={16} className={`text-zinc-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-zinc-500 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
