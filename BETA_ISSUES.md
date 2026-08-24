# InkBook — Controlled Beta Issues Log

This log tracks **real issues found by real beta studios**, starting with Studio #1. It is separate from `REAL_STUDIO_ISSUES.md` (which covers the pre-beta simulated QA pass) — do not merge them, but cross-reference by ID where a beta finding turns out to be the same root cause as an existing simulated finding.

**No entries yet.** Studio #1 onboarding has not started (see `BETA_STUDIO_1.md`). Nothing below is fabricated — the first real entry gets added the first time a real beta studio hits a real problem.

---

## How to log an issue

Copy this template for every genuine issue. One entry per distinct problem.

```
## BETA-XXX
ID: BETA-XXX
DATE:
STUDIO:
PERSONA:            (Owner / Artist / Client)
WORKFLOW:
PRIORITY:           (P0 / P1 / P2 / P3 — see below)
EXPECTED:
ACTUAL:
REPRO STEPS:
ROOT CAUSE:
FIX:
RETEST:
STATUS:             (OPEN / FIX IN PROGRESS / FIXED — PENDING RETEST / VERIFIED FIXED / DEFERRED — NEEDS_SIAM / WON'T FIX)
LAUNCH IMPACT:      (does this block Studio #1 reaching STABLE per BETA_STUDIO_1.md Task 5? Yes/No + why)
```

Priority definitions:
- **P0** — security/data/payment danger. Real money, real client data, or real security at risk. Immediate attention, no exceptions.
- **P1** — core workflow blocked. A real studio, artist, or client cannot complete something they need to do. Immediate attention.
- **P2** — important usability/reliability issue. Works, but badly enough to cause real friction or confusion. Batch efficiently, don't let it distract from P0/P1.
- **P3** — minor polish. Should not distract from real studio usage; fix opportunistically.

---

## Workflow for every issue found during beta

1. **RECORD** — log it here immediately, using the template above, even before it's fully understood.
2. **REPRODUCE** — confirm it's real and repeatable before touching any code. Don't fix based on a single ambiguous report.
3. **FIX** — smallest safe change that addresses the actual root cause. Never touch a locked/unrelated module to fix something else.
4. **FOCUSED RETEST** — verify the exact broken step, plus the immediately adjacent steps in that workflow (e.g. a quote bug fix gets retested for quote → deposit handoff too).
5. **VERIFY** — mark VERIFIED FIXED only after real confirmation, not "should be fixed now."
6. **CONTINUE** — do not let a normal bug (P2/P3, or even an in-progress P0/P1 with a clear path) stop observation of the rest of the studio's real usage. Keep watching everything else while a fix is in progress.

P0/P1 get immediate attention the moment they're found. P2s can be grouped into an efficient batch rather than fixed one at a time. P3s are noted and picked up opportunistically — never let them interrupt real studio usage or distract from something more important.

---

## Hard rules during real beta (non-negotiable)

These apply for the entire duration Studio #1 (and any studio after it) is live with real data:

- **Never modify or delete real studio/client data casually.** If a fix requires touching real production rows, that's a deliberate, careful, logged action — not a routine step.
- **Never run destructive database operations** (schema DDL, migrations, bulk deletes) without Siam's explicit approval, even to fix a real bug quickly.
- **Never change production payment architecture** (Stripe Connect flag, webhook logic, charge routing) without Siam's explicit approval — a real studio's real money is now involved.
- **Never weaken auth, RLS, or any other security control** to work around a bug, even temporarily.
- **Never invent legal or consent requirements.** If a beta studio's state needs different consent language than the current generic flow, that's a `NEEDS_SIAM` item (a legal-content decision), not something to guess at to unblock a studio.
- **Any of the above situations get logged here as `DEFERRED — NEEDS_SIAM`, not silently worked around.**

## What does NOT need to stop for Siam

Ordinary application-layer bugs — a wrong status label, a display bug, a validation edge case, a UI confusion point, a broken (non-payment, non-auth, non-schema) workflow step — follow the normal RECORD → REPRODUCE → FIX → RETEST → VERIFY → CONTINUE loop above without waiting for approval, exactly as the pre-beta QA passes did. The hard-rule list above is specifically for the categories that get more dangerous once real money and real client data are involved, not a blanket "ask before every fix."
