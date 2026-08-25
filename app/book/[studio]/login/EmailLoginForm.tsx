"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkOtpSendAllowed } from "./rate-limit-action";

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

    const rateLimit = await checkOtpSendAllowed(email);
    if (!rateLimit.allowed) {
      setLoading(false);
      setError("Too many attempts. Please wait a bit before trying again.");
      return;
    }

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
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="border border-red-200 text-red-700 text-sm px-4 py-3 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email-login-input" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
            Email
          </label>
          <input
            id="email-login-input"
            required
            autoFocus
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[var(--brand-primary)] transition-colors disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full text-sm font-bold uppercase tracking-widest py-3.5 mt-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: brandColor, color: textOnBrand }}
        >
          {loading ? "Sending code…" : "Continue"}
        </button>
      </form>

      <p className="text-zinc-400 text-xs text-center mt-6 leading-relaxed">
        New here? We&apos;ll automatically create your account — no separate sign-up required.
      </p>
    </div>
  );
}
