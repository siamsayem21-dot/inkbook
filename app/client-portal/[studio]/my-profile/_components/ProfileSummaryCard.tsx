import { BadgeCheck } from "lucide-react";

interface Props {
  fullName: string | null;
  email: string;
  verified: boolean;
}

function initials(nameOrEmail: string): string {
  const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export default function ProfileSummaryCard({ fullName, email, verified }: Props) {
  const displayName = fullName || email.split("@")[0];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex items-center gap-4 flex-wrap">
      <span className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-xl font-semibold flex items-center justify-center shrink-0">
        {initials(displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-zinc-900 truncate">{displayName}</p>
        <p className="text-sm text-zinc-500 truncate">{email}</p>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${
          verified ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
        }`}
      >
        <BadgeCheck size={13} />
        {verified ? "Email Verified" : "Unverified"}
      </span>
    </div>
  );
}
