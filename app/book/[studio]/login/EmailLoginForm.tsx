"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  studioSlug: string;
  brandColor: string;
  textOnBrand: string;
}

export default function EmailLoginForm({ studioSlug, brandColor, textOnBrand }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    router.push(`/book/${studioSlug}/login/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="border border-white/[0.08] bg-zinc-900/50 p-8">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="border border-red-800/60 text-red-400 text-sm px-4 py-3 bg-red-950/40">
            {error}
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
            Email
          </label>
          <input
            required
            autoFocus
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-zinc-900 border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--brand-primary)] transition-colors disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full text-sm font-bold uppercase tracking-widest py-3.5 mt-2 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: brandColor, color: textOnBrand }}
        >
          {loading ? "Sending code…" : "Continue"}
        </button>
      </form>

      <p className="text-zinc-600 text-xs text-center mt-6 leading-relaxed">
        New here? We&apos;ll automatically create your account — no separate sign-up required.
      </p>
    </div>
  );
}
