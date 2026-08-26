"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, sendDepositRequest, assignSchedule, markCompleted, requestRemainderPayment } from "./actions";
import PaymentSetupNotice from "@/components/owner/PaymentSetupNotice";

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
  balanceDueCents: number | null; // null when this booking has no agreed total price
  remainderCollected: boolean;
  remainderPaymentStatus: DepositPaymentStatus;
  remainderParam: string | null; // "paid" | "cancelled" | null — from ?remainder= query param
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
  balanceDueCents,
  remainderCollected,
  remainderPaymentStatus,
  remainderParam,
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
  const [remainderLink, setRemainderLink] = useState<string | null>(null);
  const [remainderCopied, setRemainderCopied] = useState(false);
  const [remainderError, setRemainderError] = useState<string | null>(null);
  const router = useRouter();

  // cancelled, completed, and no_show are all terminal, historical outcomes —
  // none of them can be reverted by cancelling. Matches cancelBooking()'s own
  // server-side guard (app/(owner)/owner/bookings/[bookingId]/actions.ts).
  const isCancellable      = status !== "cancelled" && status !== "completed" && status !== "no_show";
  const canSendDeposit     = status === "pending_deposit";
  const depositRequestSent = depositPaymentStatus === "pending";
  const needsSchedule      = status === "awaiting_schedule" && !date;
  const waitingOnConsent   = status === "awaiting_schedule" && Boolean(date);
  const canMarkCompleted   = status === "confirmed" && hasConsent;
  const canRequestRemainder =
    (status === "confirmed" || status === "completed") &&
    balanceDueCents !== null && balanceDueCents > 0 && !remainderCollected;
  const remainderRequestSent = remainderPaymentStatus === "pending";

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

  function handleRequestRemainder() {
    setRemainderError(null);
    startTransition(async () => {
      const result = await requestRemainderPayment(bookingId);
      if (result.error) {
        setRemainderError(result.error);
        return;
      }
      if (result.checkoutUrl) {
        setRemainderLink(result.checkoutUrl);
      }
    });
  }

  function handleCopyRemainderLink() {
    if (!remainderLink) return;
    navigator.clipboard.writeText(remainderLink).then(() => {
      setRemainderCopied(true);
      setTimeout(() => setRemainderCopied(false), 2500);
    });
  }

  return (
    <div className="space-y-4">
      {/* Return banners after Stripe redirect */}
      {depositParam === "paid" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-emerald-600">✓</span>
          Payment complete. Webhook will confirm the booking once processed.
        </div>
      )}
      {depositParam === "cancelled" && (
        <div className="bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm rounded-xl px-4 py-3">
          Payment was cancelled. The deposit request is still pending.
        </div>
      )}
      {remainderParam === "paid" && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-emerald-600">✓</span>
          Payment complete. Webhook will mark the balance collected once processed.
        </div>
      )}
      {remainderParam === "cancelled" && (
        <div className="bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm rounded-xl px-4 py-3">
          Payment was cancelled. The remainder request is still pending.
        </div>
      )}

      {/* Deposit request block — shown for all pending_deposit bookings */}
      {canSendDeposit && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Deposit request</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {depositRequestSent
                  ? "Awaiting client payment"
                  : `$${(depositAmountCents / 100).toFixed(2)} required to confirm this booking`}
              </p>
            </div>

            {depositRequestSent && !depositLink ? (
              /* Request already sent, no fresh link — show pending indicator */
              <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full cursor-default select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Deposit Request Sent
              </div>
            ) : !depositLink ? (
              /* No request yet — active generate button */
              <button
                onClick={handleSendDeposit}
                disabled={isPending}
                className="shrink-0 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="flex-1 min-w-0 bg-zinc-50 border border-zinc-200 text-zinc-600 text-xs rounded-xl px-3 py-2.5 focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    copied
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-violet-600 hover:bg-violet-700 text-white"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                Send this link to the client via text or email. Do not open it yourself.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Remainder request block — shown once a balance is owed and not yet collected */}
      {canRequestRemainder && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Remaining balance</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {remainderRequestSent
                  ? "Awaiting client payment"
                  : `$${((balanceDueCents ?? 0) / 100).toFixed(2)} remaining for this session`}
              </p>
            </div>

            {remainderRequestSent && !remainderLink ? (
              <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full cursor-default select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Remainder Request Sent
              </div>
            ) : !remainderLink ? (
              <button
                onClick={handleRequestRemainder}
                disabled={isPending}
                className="shrink-0 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Generating link…" : "Request Remainder Payment"}
              </button>
            ) : null}
          </div>

          {remainderLink && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={remainderLink}
                  className="flex-1 min-w-0 bg-zinc-50 border border-zinc-200 text-zinc-600 text-xs rounded-xl px-3 py-2.5 focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyRemainderLink}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    remainderCopied
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-violet-600 hover:bg-violet-700 text-white"
                  }`}
                >
                  {remainderCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                Send this link to the client via text or email. Do not open it yourself.
              </p>
            </div>
          )}
          {remainderError && <PaymentSetupNotice message={remainderError} className="text-sm text-red-600 mt-3" />}
        </div>
      )}

      {/* Assign schedule — awaiting_schedule bookings with no date/time yet */}
      {needsSchedule && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Assign schedule</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Deposit is paid — set a date and time to move this booking forward.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <button
              onClick={handleAssignSchedule}
              disabled={isPending || !scheduleDate || !scheduleTime}
              className="text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Assigning…" : "Assign Schedule"}
            </button>
          </div>
          {!hasConsent && (
            <p className="text-[10px] text-zinc-400">
              This booking will stay &quot;Awaiting schedule&quot; until the client also signs their consent form — it only
              moves to Confirmed once both are done.
            </p>
          )}
          {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}
        </div>
      )}

      {/* Waiting on consent — schedule already assigned, consent is the only thing left */}
      {waitingOnConsent && (
        <div className="bg-violet-50 border border-violet-200 text-violet-700 text-sm rounded-xl px-4 py-3">
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
              className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {isPending ? "Marking…" : "Mark Session Completed"}
            </button>
          ) : (
            <span className="text-sm text-zinc-500 bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl">
              Consent form required before this session can be marked completed
            </span>
          )}
        </div>
      )}
      {completedError && <p className="text-sm text-red-600">{completedError}</p>}

      {/* Consent + cancel row */}
      <div className="flex flex-wrap items-center gap-3">
        {hasConsent ? (
          <button
            onClick={() => setShowConsent((v) => !v)}
            className="text-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-xl transition-colors"
          >
            {showConsent ? "Hide consent form" : "View consent form"}
          </button>
        ) : (
          <span className="text-sm text-zinc-500 bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl">
            No consent form submitted
          </span>
        )}

        {isCancellable && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            Cancel booking
          </button>
        )}

        {isCancellable && showConfirm && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <span className="text-sm text-red-700">Cancel this booking?</span>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Keep it
            </button>
          </div>
        )}
      </div>

      {error && <PaymentSetupNotice message={error} />}

      {showConsent && consentForm && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900">Consent Form</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Signed at</p>
              <p className="font-medium text-zinc-800">{new Date(consentForm.signed_at).toLocaleString("en-US")}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">State template</p>
              <p className="font-medium text-zinc-800">{consentForm.state_template}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Minor</p>
              <p className="font-medium text-zinc-800">{consentForm.is_minor ? "Yes" : "No"}</p>
            </div>
            {consentForm.is_minor && consentForm.guardian_name && (
              <div>
                <p className="text-zinc-400 text-xs mb-0.5">Guardian</p>
                <p className="font-medium text-zinc-800">{consentForm.guardian_name}</p>
              </div>
            )}
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Client signature</p>
              <p className="font-medium text-emerald-600">✓ Signed</p>
            </div>
            {consentForm.id_photo_url && (
              <div>
                <p className="text-zinc-400 text-xs mb-0.5">ID photo</p>
                <a
                  href={consentForm.id_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:underline text-sm"
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
