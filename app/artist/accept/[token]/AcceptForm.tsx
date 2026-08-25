"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "./actions";
import PasswordInput from "@/components/ui/PasswordInput";

export default function AcceptForm({
  token,
  inviteeName,
  studioName,
  email,
}: {
  token: string;
  inviteeName: string;
  studioName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(inviteeName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Server action: creates auth user + artist row + marks invite accepted
    const result = await acceptInvite({ token, name: name.trim(), password });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Sign in with the credentials they just set
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Account was created — just redirect to login, user can sign in manually
      router.push("/login?activated=1");
      return;
    }

    router.push("/artist/dashboard");
    router.refresh();
  }

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Email — read-only, shows what they're joining as */}
      <div>
        <label htmlFor="accept-email" className="text-xs font-medium text-zinc-500 block mb-2">Email</label>
        <input
          id="accept-email"
          type="email"
          value={email}
          readOnly
          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label htmlFor="accept-name" className="text-xs font-medium text-zinc-500 block mb-2">
          Your name <span className="text-violet-600">*</span>
        </label>
        <input
          id="accept-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-colors placeholder:text-zinc-400"
        />
      </div>

      <PasswordInput
        id="accept-password"
        label="Set a password *"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <PasswordInput
        id="accept-confirm-password"
        label="Confirm password *"
        placeholder="Repeat your password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch}
      />
      {mismatch && <p className="text-red-600 text-xs -mt-3">Passwords do not match</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 text-white font-semibold py-3 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Setting up your account…
          </>
        ) : (
          `Join ${studioName} →`
        )}
      </button>
    </form>
  );
}
