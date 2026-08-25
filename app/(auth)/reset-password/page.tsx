"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/ui/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verify the session was set by the auth callback before showing the form
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login?error=link_expired");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/owner/dashboard");
  }

  const mismatch = confirm.length > 0 && password !== confirm;

  if (checking) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-elevation-3 p-8 text-center">
        <p className="text-zinc-500 text-sm">Verifying your reset link…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-elevation-3 p-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">IB</span>
        </div>
        <span className="font-serif text-lg tracking-wide text-zinc-900">InkBook</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1 text-zinc-900">Set new password</h1>
      <p className="text-zinc-500 text-sm mb-8">
        Choose a strong password for your account.
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-red-200 text-red-700 text-sm px-4 py-3 bg-red-50">
            {error}
          </div>
        )}

        <PasswordInput
          id="reset-password-new"
          label="New password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordInput
          id="reset-password-confirm"
          label="Confirm password"
          placeholder="Repeat your new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch}
        />
        {mismatch && (
          <p className="text-red-600 text-xs -mt-2">Passwords do not match</p>
        )}

        <button
          type="submit"
          disabled={loading || mismatch}
          className="w-full rounded-lg bg-violet-600 text-white text-sm font-semibold py-3 hover:bg-violet-700 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? "Updating password…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}
