---
name: inkbook-run
description: Continuous InkBook execution loop. Works the CURRENT task from TASKS.md one step at a time (Inspect → Build → Test → Fix → Verify), advances the queue only on real verification, and stops safely for Siam approval or blockers. Use when asked to "run inkbook", "continue the build queue", "work the next InkBook task", or similar.
---

# InkBook Continuous Execution

Runs InkBook's build queue one task at a time, safely. This skill never invents work — it only executes what `TASKS.md` already says is CURRENT, and only advances the queue when a task has been actually tested and verified.

## Permanent Startup Rule — queue auto-advance

This rule governs every run, in addition to (not instead of) the rest of this skill:

- If `## CURRENT` is empty and `## NEXT` contains one or more tasks:
  1. Move the first `NEXT` task into `## CURRENT`.
  2. Start executing that task.
  3. After it is genuinely VERIFIED, move it to `## DONE`.
  4. Promote the next `NEXT` task to `## CURRENT` and continue.
  5. Repeat until `## NEXT` is empty, or a task becomes `BLOCKED` / `NEEDS_SIAM` / requires approval.
- If both `## CURRENT` and `## NEXT` are empty, stop cleanly and report that there is no queued work.

This is exactly the flow already described in Step 0 (pulling a task into CURRENT) and Step 2 outcome A (advancing on VERIFIED) — stated here as one explicit rule. Every guardrail, safety check, and stop condition elsewhere in this skill still applies at every step of the loop; auto-advancing to the next task never skips Step 1's full Inspect → Build → Test → Fix → Verify cycle, and any task that resolves as NEEDS_SIAM, BLOCKED, or requires Siam approval still halts the loop immediately per Step 2.

## Step 0 — Load context (every run, no exceptions)

1. Read `CLAUDE.md` in full, especially the **Continuous Development Workflow** section — its rules govern this entire skill.
2. Read `TASKS.md` in full.
3. Run `git status` (and `git diff --stat` if useful). Note any uncommitted changes that are unrelated to the CURRENT task — those files are off-limits for the rest of this run.
4. Find the task under `## CURRENT` in `TASKS.md`.
   - If `## CURRENT` is empty: take the first task from `## NEXT`, move it into `## CURRENT`, and proceed.
   - If `## CURRENT` is empty and `## NEXT` is also empty: there is nothing to do. Report that the queue is empty and stop.

## Step 1 — Work ONLY the CURRENT task

Do not start, touch, or "helpfully" fix anything outside the scope of the single CURRENT task. Do not touch files already modified by unrelated uncommitted work (from Step 0.3) unless the CURRENT task explicitly names them.

Follow this cycle for the CURRENT task:

**Inspect** — Read the relevant files and understand current behavior before changing anything. Confirm what "done" means for this specific task.

**Build** — Make the smallest change that accomplishes the task.

**Test** — Run the tests/checks relevant to the files you changed (not necessarily the full suite). Useful commands available in this repo:
- `npx tsc --noEmit` — typecheck
- `npm run lint` — lint
- `npm run test` — unit tests (Vitest)
- `npm run test:ct` — component tests (Playwright CT)
- `npm run test:db` — DB verification tests (requires local Supabase)
- `npm run test:e2e` — full E2E (requires build + Supabase)
- `npm run build` — production build check

Pick whichever of these actually exercise the changed files. For a UI-only change, typecheck + lint + relevant unit/component tests is usually enough; don't run `test:e2e`/`test:db` if nothing DB- or flow-related changed.

**Fix** — If tests fail, fix and re-test. Repeat within this same task; do not move on with failing checks.

**Visual QA gate (only when the task touched rendered UI)** — After functional tests pass, check whether any changed file is a UI/rendered-frontend file: anything under `app/**` except `app/api/**`, anything under `components/**`, or `app/globals.css`. If none of the changed files match, skip this gate entirely and go straight to Verify. If any do, run the gate before Verify:

1. `npm run test:visual` (V1 — runtime/layout QA) and `npm run test:visual:v2` (V2 — baseline comparison) against the current dev server. Both use `tests/visual-routes.mjs`'s covered-route list by default; set `VISUAL_QA_ROUTES` to just the task's affected route(s) if known, to keep the gate fast — but when in doubt, leave it unset and run the full covered set, since a shared component change can affect other covered pages too.
2. If both pass: the gate passes, continue to Verify.
3. If V2 fails on anything: first set `VISUAL_QA_AUTO_FIX_ALLOWED_FILES` to exactly this task's changed files (comma-separated, forward-slash paths, matching what `git status`/`git diff --stat` shows for this task — never the whole repo). This keeps the next step from ever "fixing" an unrelated pre-existing regression elsewhere as a side effect of this task.
4. Run `npm run test:visual:v3:auto`. This runs the full V3 pipeline itself: AI review classifies every V2 failure, and for anything classified `REAL_REGRESSION` at ≥0.8 confidence AND inside the allowed-files scope AND not on a blocked route/file (payment, auth, consent, deposit, schema/migrations, webhooks — see `scripts/visual-qa/lib/safety.mjs`), it attempts up to 3 minimal single-file fixes, reverifying with V1+V2 after each, always restoring the file if an attempt fails. It never writes to an approved baseline (`updateSnapshots` stays `"none"` throughout) — the only command that ever does that is the separate, always-manual `npm run test:visual:v2:update-baseline`, which this gate must never invoke on its own.
5. Run `npm run test:visual:v3:report` and read `reports/visual-qa-v3/final-report.json`:
   - `finalStatus === "PASS"` and `siamNeeded === false` → the gate passes. If the auto-fix loop changed any file (`filesChanged` is non-empty), re-run this task's normal functional tests once more against the fixed code before continuing to Verify — a visual fix must not be allowed to silently break something functional.
   - Otherwise → the gate fails. Read `siamReasons` for the exact cause per route/viewport. This always means the outcome is **B. NEEDS_SIAM** (see Step 2) — never BLOCKED, since a Visual QA gate failure is a product/visual judgment call, not a technical blocker. Write the classification(s) and reasons from the report directly into the NEEDS_SIAM note in `TASKS.md` so Siam sees exactly what was found without re-running anything.
6. Unset `VISUAL_QA_AUTO_FIX_ALLOWED_FILES` when done with this task (don't leak it into unrelated later work in the same session).

The classification-to-outcome mapping the report already encodes, restated for clarity:
- `REAL_REGRESSION` (high confidence, in-scope, safe route/file) → auto-fixed and reverified above; only reaches here if that failed or was out of scope, in which case → NEEDS_SIAM.
- `ACCEPTABLE_VARIATION` → the gate only passes on this classification when V3 reports it with real confidence, not a guess; `final-report.mjs` already folds this into `finalStatus`/`siamNeeded`, so trust its output rather than re-deriving this yourself from the raw AI review.
- `INTENTIONAL_CHANGE_NEEDS_BASELINE_APPROVAL` → NEEDS_SIAM. A deliberate visual change still needs a human to run `test:visual:v2:update-baseline` themselves; this skill never does it automatically.
- `UNCERTAIN_NEEDS_SIAM` → NEEDS_SIAM.
- Anything touching payment, auth, consent, deposit, security, database schema/migrations, or another destructive/irreversible area → the existing Guardrails below are still mandatory regardless of what Visual QA concludes; a clean visual gate never overrides them.

**Verify** — Confirm the result actually matches the task's goal, not just that code compiles or tests are green in isolation. A task is VERIFIED only when you have run and observed passing results from real tests/checks for the changed files, AND — for any task that touched rendered UI — the Visual QA gate above has actually passed. Writing code, or reasoning that it "should work," is never sufficient to call something VERIFIED.

## Step 2 — Resolve the task

Exactly one of these four outcomes:

**A. VERIFIED**
- Edit `TASKS.md`: remove the task from `## CURRENT`, add it under `## DONE` with a short verification note (what was tested, what passed, date).
- Move the first item from `## NEXT` into `## CURRENT`.
- Go back to Step 1 and continue with the new CURRENT task.
- If `## NEXT` is now empty, stop and report the queue is complete.

**B. NEEDS_SIAM** — the task requires visual confirmation, a subjective/product decision, or touches anything in the CLAUDE.md "Requires Siam approval before" list (production deploy, destructive DB/Supabase changes, deleting production data, Stripe/payment changes, auth/security-sensitive production changes, destructive git operations, anything irreversible):
- Move the task from `## CURRENT` to `## NEEDS_SIAM` in `TASKS.md`.
- Write a precise note: exactly what Siam needs to look at or decide, and why the skill can't proceed without it.
- Stop safely. Do not start the next NEXT task.

**C. BLOCKED** — the task cannot proceed for a technical reason (missing dependency, failing test unrelated to this change, unclear/contradictory requirement, missing env var, etc.):
- Move the task from `## CURRENT` to `## BLOCKED` in `TASKS.md`.
- Record the concrete reason.
- Stop safely. Do not start the next NEXT task.

**D. Nothing left** — `## NEXT` is empty after a task completes: stop and report the queue is complete.

## Guardrails — never do these automatically

Regardless of how confident the change seems, the following always require explicit Siam approval first (route to NEEDS_SIAM instead of doing them):
- Production deployment
- Destructive database/Supabase changes (drops, irreversible migrations, data-altering operations)
- Deleting production data
- Stripe/payment configuration changes
- Authentication/security-sensitive production changes
- Destructive git operations (`reset --hard`, force-push, `checkout` that discards changes, `clean`, branch deletion)
- Any other action that is irreversible

Also never:
- Commit, stash, or otherwise touch git state as part of this skill unless a task explicitly and narrowly calls for it and it's non-destructive.
- Modify files that are part of unrelated uncommitted work found in Step 0.3.
- Mark a task DONE based on code existing rather than a passing test/check you actually ran.
- Batch-advance multiple tasks without running Step 1's full cycle on each one individually.
- Run `npm run test:visual:v2:update-baseline` (or pass `--update-snapshots` to a Visual QA config any other way) as part of this skill. An approved baseline is only ever updated by Siam running that command themselves after reviewing an intentional visual change — this skill's Visual QA gate only ever compares against, never writes, a baseline.
- Let the Visual QA auto-fix loop run without `VISUAL_QA_AUTO_FIX_ALLOWED_FILES` scoped to the current task's own changed files. Without it, a passing regression check on an unrelated page could silently rewrite a file this task never touched.

## Keep it simple

One task, one cycle, one outcome. If something feels like it needs a bigger process than Inspect → Build → Test → Fix → Verify, that's a signal to stop and put it in NEEDS_SIAM or BLOCKED rather than improvising a heavier process.
