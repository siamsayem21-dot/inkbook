"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "./actions";

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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Email — read-only, shows what they're joining as */}
      <div>
        <label htmlFor="accept-email" className="text-sm text-zinc-400 block mb-1.5">Email</label>
        <input
          id="accept-email"
          type="email"
          value={email}
          readOnly
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label htmlFor="accept-name" className="text-sm text-zinc-400 block mb-1.5">
          Your name <span className="text-[#c9a84c]">*</span>
        </label>
        <input
          id="accept-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#c9a84c] transition-colors placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label htmlFor="accept-password" className="text-sm text-zinc-400 block mb-1.5">
          Set a password <span className="text-[#c9a84c]">*</span>
        </label>
        <input
          id="accept-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#c9a84c] transition-colors placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label htmlFor="accept-confirm-password" className="text-sm text-zinc-400 block mb-1.5">
          Confirm password <span className="text-[#c9a84c]">*</span>
        </label>
        <input
          id="accept-confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-[#E8E8E8] focus:outline-none focus:border-[#c9a84c] transition-colors placeholder:text-zinc-600"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#c9a84c] text-black font-bold py-3 rounded-lg hover:bg-[#a8832e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
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
