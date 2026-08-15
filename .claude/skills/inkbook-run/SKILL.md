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

**Verify** — Confirm the result actually matches the task's goal, not just that code compiles or tests are green in isolation. A task is VERIFIED only when you have run and observed passing results from real tests/checks for the changed files. Writing code, or reasoning that it "should work," is never sufficient to call something VERIFIED.

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

## Keep it simple

One task, one cycle, one outcome. If something feels like it needs a bigger process than Inspect → Build → Test → Fix → Verify, that's a signal to stop and put it in NEEDS_SIAM or BLOCKED rather than improvising a heavier process.
