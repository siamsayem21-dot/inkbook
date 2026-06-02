"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking } from "./actions";

type ConsentForm = {
  id: string;
  signed_at: string;
  state_template: string;
  is_minor: boolean;
  guardian_name: string | null;
  id_photo_url: string;
} | null;

interface Props {
  bookingId: string;
  status: string;
  hasConsent: boolean;
  consentForm: ConsentForm;
}

export default function BookingActions({ bookingId, status, hasConsent, consentForm }: Props) {
  const [showConsent, setShowConsent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isCancellable = status !== "cancelled" && status !== "completed";

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelBooking(bookingId);
      if (result.error) {
        setError(result.error);
        setShowConfirm(false);
      } else {
        router.push("/owner/bookings");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {hasConsent ? (
          <button
            onClick={() => setShowConsent((v) => !v)}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors"
          >
            {showConsent ? "Hide consent form" : "View consent form"}
          </button>
        ) : (
          <span className="text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full">
            No consent form submitted
          </span>
        )}

        {isCancellable && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel booking
          </button>
        )}

        {isCancellable && showConfirm && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-xl px-4 py-2.5">
            <span className="text-sm text-red-300">Cancel this booking?</span>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {isPending ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Keep it
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {showConsent && consentForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Consent Form</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Signed at</p>
              <p className="font-medium">{new Date(consentForm.signed_at).toLocaleString("en-US")}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">State template</p>
              <p className="font-medium">{consentForm.state_template}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Minor</p>
              <p className="font-medium">{consentForm.is_minor ? "Yes" : "No"}</p>
            </div>
            {consentForm.is_minor && consentForm.guardian_name && (
              <div>
                <p className="text-zinc-400 text-xs mb-0.5">Guardian</p>
                <p className="font-medium">{consentForm.guardian_name}</p>
              </div>
            )}
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Client signature</p>
              <p className="font-medium text-green-400">✓ Signed</p>
            </div>
            {consentForm.id_photo_url && (
              <div>
                <p className="text-zinc-400 text-xs mb-0.5">ID photo</p>
                <a
                  href={consentForm.id_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#c9a84c] hover:underline text-sm"
                >
                  View ID →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
