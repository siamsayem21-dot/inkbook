# Siam's 20-30 Minute Manual Check — 2026-08-29 Full QA Run

Everything mechanically testable has been tested. This is only the stuff
that needs a human's actual feel — speed, clarity, whether a flow *feels*
right — not a repeat of what was already verified.

1. **Deploy decision on the 5 uncommitted fixes** (`git diff --stat` shows
   exactly what changed — 8 files, all small and additive). Read
   `FULLQA_FINAL_REPORT_20260829.md`'s bug summaries, especially the P0
   and the AI-knowledge trade-off, then decide: commit + deploy as-is?

2. **Run the pending SQL migration** for `sms-reminders`
   (`supabase/migrations/20260802000000_appointment_reminder_email.sql`)
   in the Supabase SQL Editor — 2 lines, additive, already reviewed twice.
   This alone restores real appointment reminders.

3. **Feel the AI Consultation wizard yourself**, start to finish, as a
   real prospective client would. Does the pacing feel right? Does the
   AI's tone match what you'd want a stranger to see first?

4. **Feel the Stripe deposit checkout handoff** — the moment a client
   clicks "Pay Deposit" through to landing back on your site. Any jank?

5. **Open the Owner dashboard on your own phone**, not a resized browser
   window. Does anything feel cramped or awkward that an automated tap
   test wouldn't catch?

6. **Read the P2 AI-knowledge trade-off** in the final report and make
   the call — it's a genuine product judgment, not something to leave to
   QA. (Safe default is already in place either way.)

Everything else — every button, every role, every edge case, security
isolation, payment routing, cron behavior — has already been verified
this run with real interaction and is documented in
`FULLQA_FINAL_REPORT_20260829.md`, `FUNCTIONAL_TEST_MATRIX.md`, and
`FUNCTIONAL_BUG_LOG.md`.
