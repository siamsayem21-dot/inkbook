"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <p className="text-zinc-500 text-sm">Verifying your reset link…</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
          <span className="text-black text-xs font-black">IB</span>
        </div>
        <span className="font-bold">InkBook</span>
      </div>

      <h1 className="text-2xl font-bold mb-1">Set new password</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Choose a strong password for your account.
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="reset-password-new" className="text-sm text-zinc-400 block mb-1.5">New password</label>
          <input
            id="reset-password-new"
            required
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label htmlFor="reset-password-confirm" className="text-sm text-zinc-400 block mb-1.5">Confirm password</label>
          <input
            id="reset-password-confirm"
            required
            type="password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full bg-zinc-800 border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors ${
              mismatch
                ? "border-red-700 focus:border-red-600"
                : "border-zinc-700 focus:border-gold"
            }`}
          />
          {mismatch && (
            <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || mismatch}
          className="w-full bg-gold text-black font-bold py-2.5 rounded-lg hover:bg-gold-light disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? "Updating password…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}
