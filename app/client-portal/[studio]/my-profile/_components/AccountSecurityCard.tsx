import { ShieldCheck } from "lucide-react";

interface Props {
  verified: boolean;
  memberSinceLabel: string | null;
}

// Every field here is real: login method reflects the actual (only) auth
// mechanism this app supports, verified comes from Supabase Auth's own
// user.email_confirmed_at, and memberSinceLabel is client_accounts.created_at.
// No password fields — InkBook is Email OTP only, so there's nothing to
// change or reset.
export default function AccountSecurityCard({ verified, memberSinceLabel }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={16} />
        </span>
        <h2 className="text-base font-semibold text-zinc-900">Account & Security</h2>
      </div>

      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">Login Method</span>
          <span className="text-sm font-medium text-zinc-800">Email OTP (passwordless)</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">Email Verification</span>
          <span
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
              verified ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
            }`}
          >
            {verified ? "Verified" : "Unverified"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">Member Since</span>
          <span className="text-sm font-medium text-zinc-800">{memberSinceLabel ?? "—"}</span>
        </div>
      </div>

      <p className="text-[11px] text-zinc-300 mt-4 pt-4 border-t border-zinc-100">
        InkBook uses secure, passwordless email sign-in — there&apos;s no password to manage or reset.
      </p>
    </div>
  );
}
