import { Lock } from "lucide-react";

// No safe, existing client-self-service account deletion flow exists (the
// one auth.admin.deleteUser() call in this codebase is unrelated — artist
// invite token cleanup, app/artist/accept/[token]/actions.ts). Rather than
// invent destructive backend behavior here, Delete Account is shown as
// visibly present but disabled, matching the "Coming soon" affordance used
// elsewhere in this portal (e.g. My Profile / Studio nav items).
export default function PrivacyAccountCard() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <Lock size={16} />
        </span>
        <h2 className="text-base font-semibold text-zinc-900">Privacy & Account</h2>
      </div>

      <p className="text-sm text-zinc-500 mb-4">
        Your project, consultation, and booking data is only visible to you and the studios you work with.
      </p>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-4 py-3.5">
        <div>
          <p className="text-sm font-medium text-zinc-800">Delete Account</p>
          <p className="text-xs text-zinc-400 mt-0.5">Not available yet — coming in a future update.</p>
        </div>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="text-sm font-semibold rounded-xl py-2 px-4 bg-zinc-100 text-zinc-400 cursor-not-allowed shrink-0"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
