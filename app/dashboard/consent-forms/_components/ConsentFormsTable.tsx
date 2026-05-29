"use client";

import { useEffect, useState } from "react";

export type ConsentFormRow = {
  id: string;
  full_name: string;
  date_of_birth: string;
  is_minor: boolean;
  blood_thinner: boolean;
  diabetic: boolean;
  skin_condition: boolean;
  pregnant: boolean;
  tattoo_placement: string;
  artist_name: string;
  design_description: string;
  agreed_to_aftercare: boolean;
  client_signature: string;
  signed_at: string;
};

interface Props {
  forms: ConsentFormRow[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDob(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function calcAge(dob: string): number {
  const birth = new Date(dob + "T12:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function hasHealthFlag(f: ConsentFormRow) {
  return f.blood_thinner || f.diabetic || f.skin_condition || f.pregnant;
}

const HEALTH_LABELS: { key: keyof ConsentFormRow; label: string }[] = [
  { key: "blood_thinner", label: "Blood thinners / aspirin" },
  { key: "diabetic", label: "Diabetes" },
  { key: "skin_condition", label: "Skin condition" },
  { key: "pregnant", label: "Pregnant or breastfeeding" },
];

// ── Slide-over panel ──────────────────────────────────────────────────────────
function SlideOver({
  form,
  onClose,
}: {
  form: ConsentFormRow | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          form ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-[#0D0D0D] border-l border-white/10 z-50 flex flex-col transition-transform duration-300 ${
          form ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {form && (
          <>
            {/* Panel header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-white/10">
              <div>
                <p className="font-bold text-lg">{form.full_name}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Signed {formatDate(form.signed_at)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white text-xl leading-none mt-0.5 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

              {/* Identity */}
              <section>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Identity</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Date of birth</span>
                    <span>{formatDob(form.date_of_birth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Age</span>
                    <span>{calcAge(form.date_of_birth)} years old</span>
                  </div>
                  {form.is_minor && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Minor</span>
                      <span className="text-yellow-400">⚠ Yes</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Health disclosures */}
              <section>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Health disclosures</p>
                <div className="space-y-2">
                  {HEALTH_LABELS.map(({ key, label }) => {
                    const flagged = !!form[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-white/50">{label}</span>
                        <span className={flagged ? "text-yellow-400 font-medium" : "text-white/20"}>
                          {flagged ? "⚠ Yes" : "No"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Appointment */}
              <section>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Appointment</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Artist</span>
                    <span>{form.artist_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Placement</span>
                    <span>{form.tattoo_placement}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-white/50 text-xs mb-1.5">Design description</p>
                  <p className="text-sm bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white/80 leading-relaxed">
                    {form.design_description}
                  </p>
                </div>
              </section>

              {/* Consent & signature */}
              <section>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Consent &amp; signature</p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Agreed to aftercare</span>
                    <span
                      className={
                        form.agreed_to_aftercare
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {form.agreed_to_aftercare ? "✓ Yes" : "✕ No"}
                    </span>
                  </div>
                  <div>
                    <p className="text-white/50 mb-1.5">Digital signature</p>
                    <p className="font-[cursive] text-base text-gold bg-gold/5 border border-gold/20 rounded-xl px-4 py-3">
                      {form.client_signature}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export default function ConsentFormsTable({ forms }: Props) {
  const [selected, setSelected] = useState<ConsentFormRow | null>(null);

  if (forms.length === 0) {
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-2xl px-5 py-16 text-center">
        <p className="text-white/40 text-sm mb-1">No consent forms yet.</p>
        <p className="text-white/25 text-xs">
          Forms submitted at <span className="text-white/40">/book/[studio]/consent</span> will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {["Client", "Date of birth", "Artist", "Placement", "Signed", "Health"].map((h) => (
                <th
                  key={h}
                  className="text-left text-white/30 text-xs font-medium px-5 py-3.5 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forms.map((f, i) => (
              <tr
                key={f.id}
                onClick={() => setSelected(f)}
                className={`cursor-pointer hover:bg-white/[0.03] transition-colors ${
                  i < forms.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <td className="px-5 py-4 font-medium">{f.full_name}</td>
                <td className="px-5 py-4 text-white/50">{formatDob(f.date_of_birth)}</td>
                <td className="px-5 py-4 text-white/50">{f.artist_name}</td>
                <td className="px-5 py-4 text-white/50">{f.tattoo_placement}</td>
                <td className="px-5 py-4 text-white/50">{formatDate(f.signed_at)}</td>
                <td className="px-5 py-4">
                  {hasHealthFlag(f) ? (
                    <span
                      title="Has health disclosures — click to view"
                      className="text-yellow-400 text-base"
                    >
                      ⚠
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver form={selected} onClose={() => setSelected(null)} />
    </>
  );
}
