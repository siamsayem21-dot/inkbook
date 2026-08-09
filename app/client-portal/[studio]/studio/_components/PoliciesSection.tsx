import { ScrollText } from "lucide-react";
import SectionShell from "./SectionShell";
import EmptyState from "./EmptyState";

export interface PolicyItem {
  id: string;
  title: string;
  content: string;
}

interface Props {
  items: PolicyItem[];
}

// Real studio_knowledge entries (category "policy", is_public && is_active)
// only. If a studio hasn't published a given policy, it's simply absent
// here — never replaced with an invented "standard" policy.
export default function PoliciesSection({ items }: Props) {
  return (
    <SectionShell id="policies" icon={ScrollText} eyebrow="Good to Know" title="Studio Policies">
      {items.length === 0 ? (
        <EmptyState message="This studio hasn't published its policies yet." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-100 p-4">
              <p className="text-sm font-semibold text-zinc-800 mb-1.5">{item.title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
