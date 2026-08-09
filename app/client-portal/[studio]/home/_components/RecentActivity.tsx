import { MessageSquare, FileText, Clock } from "lucide-react";
import type { MockActivity } from "../mock-data";

const ICONS = { chat: MessageSquare, info: FileText, clock: Clock } as const;

interface Props {
  items: MockActivity[];
}

export default function RecentActivity({ items }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-zinc-900">Recent Activity</h2>
        <span title="Coming soon" className="text-xs font-medium text-zinc-300 cursor-not-allowed select-none">
          View all
        </span>
      </div>

      <div className="space-y-5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.id} className="flex items-start gap-3.5">
              <span className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <Icon size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.detail}</p>
              </div>
              <span className="text-[11px] text-zinc-400 whitespace-nowrap shrink-0 mt-0.5">{item.timeAgo}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
