"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidIanaTimezone, sortedIanaTimezones } from "@/lib/timezone";
import PasswordInput from "@/components/ui/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const [studioName, setStudioName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  // Starts as just ["UTC"] so server and client render identical markup on
  // first paint — Intl.supportedValuesOf('timeZone') can return a slightly
  // different list between Node's ICU (server) and the browser's ICU
  // (client), which caused a hydration mismatch when computed eagerly at
  // module scope. The full list is only ever populated client-side, after
  // mount, alongside browser detection below.
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>(["UTC"]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Client-only: populate the full timezone list and suggest the
  // browser-detected zone. Falls back to the 'UTC' default already set if
  // detection fails or returns something outside the canonical IANA list.
  useEffect(() => {
    setTimezoneOptions(sortedIanaTimezones());
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (isValidIanaTimezone(detected)) setTimezone(detected);
    } catch {
      // Detection unsupported — 'UTC' fallback already set.
    }
  }, []);

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
      body: JSON.stringify({ name: studioName.trim(), subdomain: subdomain.trim(), timezone }),
    });
    const studioJson = await studioRes.json();

    if (!studioRes.ok) {
      setError(studioJson.error ?? "Failed to create studio.");
      setLoading(false);
      return;
    }

    router.push("/owner/dashboard");
  }

  const inputClass = "w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-colors";

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-elevation-3 p-8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">IB</span>
        </div>
        <span className="font-serif text-lg tracking-wide text-zinc-900">InkBook</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1 text-zinc-900">Create Your Studio</h1>
      <p className="text-zinc-500 text-sm mb-8">Start your free 14-day trial. No credit card required.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-red-200 text-red-700 text-sm px-4 py-3 bg-red-50">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="register-studio-name" className="text-xs font-medium text-zinc-500 block mb-2">Studio Name</label>
          <input
            id="register-studio-name"
            type="text"
            placeholder="Ink & Iron Studio"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="register-owner-name" className="text-xs font-medium text-zinc-500 block mb-2">Your Name</label>
          <input
            id="register-owner-name"
            type="text"
            placeholder="Jane Smith"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="register-email" className="text-xs font-medium text-zinc-500 block mb-2">Email</label>
          <input
            id="register-email"
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <PasswordInput
          id="register-password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div>
          <label htmlFor="register-subdomain" className="text-xs font-medium text-zinc-500 block mb-2">Subdomain</label>
          <div className="flex items-center">
            <input
              id="register-subdomain"
              type="text"
              placeholder="inkandironstudio"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              className="flex-1 rounded-l-lg border border-zinc-200 border-r-0 px-4 py-2.5 text-sm bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-colors"
            />
            <span className="rounded-r-lg bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs text-zinc-500 shrink-0">
              .inkbook.app
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="register-timezone" className="text-xs font-medium text-zinc-500 block mb-2">Timezone</label>
          <select
            id="register-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={inputClass}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="text-zinc-400 text-xs mt-1.5">
            Detected automatically — used to time your appointment reminders correctly. Change it if this isn&apos;t right.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 text-white text-sm font-semibold py-3 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
        >
          {loading ? "Creating Account…" : "Create Account"}
        </button>
      </form>

      <div className="h-px bg-zinc-100 mt-6" />
      <p className="text-zinc-500 text-sm text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-600 hover:text-violet-700 transition-colors underline underline-offset-4">
          Sign In
        </Link>
      </p>
    </div>
  );
}
