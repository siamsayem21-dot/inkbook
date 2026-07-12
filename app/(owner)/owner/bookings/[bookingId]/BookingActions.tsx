"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, sendDepositRequest, assignSchedule, markCompleted } from "./actions";

type ConsentForm = {
  id: string;
  signed_at: string;
  state_template: string;
  is_minor: boolean;
  guardian_name: string | null;
  id_photo_url: string;
} | null;

type DepositPaymentStatus = "none" | "pending" | "paid" | "refunded" | "kept";

interface Props {
  bookingId: string;
  status: string;
  date: string | null;
  depositAmountCents: number;
  hasConsent: boolean;
  consentForm: ConsentForm;
  depositParam: string | null; // "paid" | "cancelled" | null — from ?deposit= query param
  depositPaymentStatus: DepositPaymentStatus;
}

export default function BookingActions({
  bookingId,
  status,
  date,
  depositAmountCents,
  hasConsent,
  consentForm,
  depositParam,
  depositPaymentStatus,
}: Props) {
  const [showConsent, setShowConsent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [depositLink, setDepositLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [completedError, setCompletedError] = useState<string | null>(null);
  const router = useRouter();

  const isCancellable      = status !== "cancelled" && status !== "completed";
  const canSendDeposit     = status === "pending_deposit";
  const depositRequestSent = depositPaymentStatus === "pending";
  const needsSchedule      = status === "awaiting_schedule" && !date;
  const waitingOnConsent   = status === "awaiting_schedule" && Boolean(date);
  const canMarkCompleted   = status === "confirmed" && hasConsent;

  function handleAssignSchedule() {
    setScheduleError(null);
    startTransition(async () => {
      const result = await assignSchedule(bookingId, scheduleDate, scheduleTime);
      if (result.error) {
        setScheduleError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleMarkCompleted() {
    setCompletedError(null);
    startTransition(async () => {
      const result = await markCompleted(bookingId);
      if (result.error) {
        setCompletedError(result.error);
        return;
      }
      router.refresh();
    });
  }

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

  function handleSendDeposit() {
    setError(null);
    startTransition(async () => {
      const result = await sendDepositRequest(bookingId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.checkoutUrl) {
        setDepositLink(result.checkoutUrl);
      }
    });
  }

  function handleCopyLink() {
    if (!depositLink) return;
    navigator.clipboard.writeText(depositLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="space-y-4">
      {/* Return banners after Stripe redirect */}
      {depositParam === "paid" && (
        <div className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-green-400">✓</span>
          Payment complete. Webhook will confirm the booking once processed.
        </div>
      )}
      {depositParam === "cancelled" && (
        <div className="bg-zinc-900 border border-zinc-700 text-zinc-400 text-sm rounded-xl px-4 py-3">
          Payment was cancelled. The deposit request is still pending.
        </div>
      )}

      {/* Deposit request block — shown for all pending_deposit bookings */}
      {canSendDeposit && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Deposit request</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {depositRequestSent
                  ? "Awaiting client payment"
                  : `$${(depositAmountCents / 100).toFixed(2)} required to confirm this booking`}
              </p>
            </div>

            {depositRequestSent && !depositLink ? (
              /* Request already sent, no fresh link — show pending indicator */
              <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full cursor-default select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Deposit Request Sent
              </div>
            ) : !depositLink ? (
              /* No request yet — active generate button */
              <button
                onClick={handleSendDeposit}
                disabled={isPending}
                className="shrink-0 text-sm font-semibold bg-[#c9a84c] hover:bg-[#b8973b] text-black px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Generating link…" : "Generate Deposit Link"}
              </button>
            ) : null}
          </div>

          {/* Copy UI — shown after link is generated */}
          {depositLink && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={depositLink}
                  className="flex-1 min-w-0 bg-[#0a0a0a] border border-zinc-700 text-zinc-400 text-xs rounded-xl px-3 py-2.5 focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    copied
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-[#c9a84c] hover:bg-[#b8973b] text-black"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-zinc-600">
                Send this link to the client via text or email. Do not open it yourself.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Assign schedule — awaiting_schedule bookings with no date/time yet */}
      {needsSchedule && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-white">Assign schedule</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Deposit is paid — set a date and time to move this booking forward.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleAssignSchedule}
              disabled={isPending || !scheduleDate || !scheduleTime}
              className="text-sm font-semibold bg-[#c9a84c] hover:bg-[#b8973b] text-black px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Assigning…" : "Assign Schedule"}
            </button>
          </div>
          {!hasConsent && (
            <p className="text-[10px] text-zinc-600">
              This booking will stay &quot;Awaiting schedule&quot; until the client also signs their consent form — it only
              moves to Confirmed once both are done.
            </p>
          )}
          {scheduleError && <p className="text-sm text-red-400">{scheduleError}</p>}
        </div>
      )}

      {/* Waiting on consent — schedule already assigned, consent is the only thing left */}
      {waitingOnConsent && (
        <div className="bg-violet-950/40 border border-violet-800/40 text-violet-300 text-sm rounded-xl px-4 py-3">
          Schedule assigned — waiting on the client to sign their consent form before this booking can be confirmed.
        </div>
      )}

      {/* Mark session completed — confirmed bookings with consent signed */}
      {status === "confirmed" && (
        <div className="flex flex-wrap items-center gap-3">
          {canMarkCompleted ? (
            <button
              onClick={handleMarkCompleted}
              disabled={isPending}
              className="text-sm font-semibold bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full transition-colors disabled:opacity-50"
            >
              {isPending ? "Marking…" : "Mark Session Completed"}
            </button>
          ) : (
            <span className="text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full">
              Consent form required before this session can be marked completed
            </span>
          )}
        </div>
      )}
      {completedError && <p className="text-sm text-red-400">{completedError}</p>}

      {/* Consent + cancel row */}
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
