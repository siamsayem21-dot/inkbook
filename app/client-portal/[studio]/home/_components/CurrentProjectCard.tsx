import Link from "next/link";
import { XCircle } from "lucide-react";

interface Row {
  label: string;
  value: string;
}

interface Props {
  status: string;
  title: string;
  subtitle: string;
  rows: Row[];
  continueHref: string | null; // real project detail link when we have one; null falls back to a disabled button
}

export default function CurrentProjectCard({ status, title, subtitle, rows, continueHref }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-900">Current Project</h2>
        <span title="Coming soon" className="text-xs font-medium text-zinc-300 cursor-not-allowed select-none">
          View details
        </span>
      </div>

      <span className="w-fit text-[11px] font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full mb-3.5">
        {status}
      </span>

      <h3 className="text-2xl font-bold text-zinc-900 mb-1.5">{title}</h3>
      <p className="text-sm text-zinc-500 mb-6">{subtitle}</p>

      <div className="space-y-3.5 flex-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{row.label}</span>
            {row.label === "Artist" && row.value === "Pending Assignment" ? (
              <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
                <XCircle size={13} className="text-zinc-300" />
                {row.value}
              </span>
            ) : (
              <span className="text-zinc-800 font-medium text-right">{row.value}</span>
            )}
          </div>
        ))}
      </div>

      {continueHref ? (
        <Link
          href={continueHref}
          className="mt-6 w-full text-center bg-violet-600 hover:bg-violet-700 text-white text-[15px] font-semibold rounded-xl py-3.5 transition-colors"
        >
          Continue Project →
        </Link>
      ) : (
        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-6 w-full text-center bg-violet-100 text-violet-400 text-[15px] font-semibold rounded-xl py-3.5 cursor-not-allowed"
        >
          Continue Project →
        </button>
      )}
    </div>
  );
}
