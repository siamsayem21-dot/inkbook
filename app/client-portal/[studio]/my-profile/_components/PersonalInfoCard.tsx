"use client";

import { useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { updateProfile } from "../actions";

interface Props {
  initialName: string;
  initialPhoneNumber: string;
  initialDateOfBirth: string; // "" or "YYYY-MM-DD"
  email: string;
}

// Formats a plain "YYYY-MM-DD" DATE column value for display without the
// classic UTC-shift bug — matches the same y/m/d-split technique already
// used by app/portal/[studio]/bookings/[bookingId]/page.tsx's own fmtDate()
// for date-only values, rather than reusing lib/utils' formatDate() (which
// is timezone-naive and meant for full ISO timestamps).
function fmtDateOnly(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Full Name, Phone Number, and Date of Birth are all backed by real, writable
// columns on client_accounts (see actions.ts / the phone+DOB migration).
// Email is the client's sign-in identity (Email OTP) and has no change flow,
// so it stays read-only.
export default function PersonalInfoCard({ initialName, initialPhoneNumber, initialDateOfBirth, email }: Props) {
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhoneNumber);
  const [dob, setDob] = useState(initialDateOfBirth);

  const [savedName, setSavedName] = useState(initialName);
  const [savedPhone, setSavedPhone] = useState(initialPhoneNumber);
  const [savedDob, setSavedDob] = useState(initialDateOfBirth);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleCancel() {
    setName(savedName);
    setPhone(savedPhone);
    setDob(savedDob);
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({ name, phoneNumber: phone, dateOfBirth: dob });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedName(name.trim());
      setSavedPhone(phone.trim());
      setSavedDob(dob.trim());
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  const inputClass =
    "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors";

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <UserRound size={16} />
          </span>
          <h2 className="text-base font-semibold text-zinc-900">Personal Information</h2>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-zinc-400 mb-1">Full Name</p>
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Add your name"
              autoFocus
              className={inputClass}
            />
          ) : (
            <p className="text-sm font-medium text-zinc-800">{savedName || "Not provided"}</p>
          )}
        </div>

        <div>
          <p className="text-xs text-zinc-400 mb-1">Email</p>
          <p className="text-sm font-medium text-zinc-800">{email}</p>
          <p className="text-[11px] text-zinc-300 mt-0.5">Used for sign-in — cannot be changed here.</p>
        </div>

        <div>
          <p className="text-xs text-zinc-400 mb-1">Phone Number</p>
          {editing ? (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder="(555) 123-4567"
              className={inputClass}
            />
          ) : (
            <p className={`text-sm font-medium ${savedPhone ? "text-zinc-800" : "text-zinc-400"}`}>{savedPhone || "Not provided"}</p>
          )}
        </div>

        <div>
          <p className="text-xs text-zinc-400 mb-1">Date of Birth</p>
          {editing ? (
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          ) : (
            <p className={`text-sm font-medium ${savedDob ? "text-zinc-800" : "text-zinc-400"}`}>
              {savedDob ? fmtDateOnly(savedDob) : "Not provided"}
            </p>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}

      {saved && <p className="text-xs text-emerald-600 mt-3">Saved ✓</p>}
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </div>
  );
}
