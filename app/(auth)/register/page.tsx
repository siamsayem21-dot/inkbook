"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [studioName, setStudioName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studioName.trim()) return setError("Studio name is required.");
    if (!ownerName.trim()) return setError("Your name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!/^[a-z0-9-]+$/.test(subdomain))
      return setError("Subdomain can only contain lowercase letters, numbers, and hyphens.");

    setLoading(true);
    const supabase = createClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: ownerName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!authData.user?.id) {
      setError("Sign-up succeeded but no user was returned. Please check your email to confirm your account.");
      setLoading(false);
      return;
    }

    // /api/studios derives the owner from the authenticated session (the
    // signUp() call above already established it) — it never trusts a
    // client-supplied user id.
    const studioRes = await fetch("/api/studios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: studioName.trim(), subdomain: subdomain.trim() }),
    });
    const studioJson = await studioRes.json();

    if (!studioRes.ok) {
      setError(studioJson.error ?? "Failed to create studio.");
      setLoading(false);
      return;
    }

    router.push("/owner/dashboard");
  }

  const inputClass = "w-full bg-zinc-900 border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50 transition-colors";

  return (
    <div className="border border-white/[0.08] bg-zinc-900/50 p-8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-7 h-7 border border-gold/40 flex items-center justify-center">
          <span className="font-cinzel text-gold text-[10px] font-bold">IB</span>
        </div>
        <span className="font-cinzel text-sm tracking-wider text-white">InkBook</span>
      </div>

      <h1 className="font-cinzel text-2xl font-bold tracking-wide mb-1">Create Your Studio</h1>
      <p className="text-zinc-500 text-sm mb-8">Start your free 14-day trial. No credit card required.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="border border-red-800/60 text-red-400 text-sm px-4 py-3 bg-red-950/40">
            {error}
          </div>
        )}

        <div>
          <label className="label-xs text-zinc-500 block mb-2">Studio Name</label>
          <input
            type="text"
            placeholder="Ink & Iron Studio"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label-xs text-zinc-500 block mb-2">Your Name</label>
          <input
            type="text"
            placeholder="Jane Smith"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label-xs text-zinc-500 block mb-2">Email</label>
          <input
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label-xs text-zinc-500 block mb-2">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="label-xs text-zinc-500 block mb-2">Subdomain</label>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="inkandironstudio"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              className="flex-1 bg-zinc-900 border border-white/[0.1] border-r-0 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50 transition-colors"
            />
            <span className="bg-zinc-800 border border-white/[0.1] px-3 py-2.5 text-xs text-zinc-500 shrink-0">
              .inkbook.app
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-black label-sm py-3 hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
        >
          {loading ? "Creating Account…" : "Create Account"}
        </button>
      </form>

      <div className="gold-divider mt-6" />
      <p className="text-zinc-600 text-sm text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-gold hover:text-gold-light transition-colors underline underline-offset-4">
          Sign In
        </Link>
      </p>
    </div>
  );
}
