---
name: inkbook-queue
description: Converts a pasted instruction from Siam's ChatGPT InkBook Project into small ordered tasks and appends them to TASKS.md under NEXT. Never codes, never marks anything DONE, never invents requirements. Use when Siam pastes a task/instruction from the ChatGPT InkBook Project, or asks to "queue this", "add this to the queue", or similar.
---

# InkBook Queue Intake

Turns a single pasted instruction from Siam's ChatGPT InkBook Project into small, ordered, executable tasks in `TASKS.md`. This skill is pure triage — it reads and writes `TASKS.md`, and nothing else. It never touches application code.

## Step 1 — Load context

1. Read `CLAUDE.md` in full. It defines the product, business rules, and the Continuous Development Workflow that governs how tasks must be phrased and scoped.
2. Read `TASKS.md` in full — all sections (`CURRENT`, `NEXT`, `BLOCKED`, `NEEDS_SIAM`, `DONE`).

## Step 2 — Preserve existing work

- Do not alter, reorder, remove, or reword anything already in `## CURRENT`, `## BLOCKED`, `## NEEDS_SIAM`, or `## DONE`.
- Do not mark anything DONE. This skill never verifies or executes work — that's `inkbook-run`'s job.
- Do not touch `## CURRENT` even if it looks stale or wrong. Leave it exactly as found.

## Step 3 — Convert the pasted instruction

Take the instruction Siam pasted (from his ChatGPT InkBook Project) and break it into small, ordered, executable tasks:

- Each task should be a single, concrete, independently-verifiable unit of work — small enough that one pass of `inkbook-run`'s Inspect → Build → Test → Fix → Verify cycle could plausibly complete it.
- Preserve the order implied by the instruction (dependencies first, e.g. schema/migration before UI that reads it).
- Use only what the instruction actually says. Do not add scope, edge cases, tests, polish steps, or "while we're at it" work that wasn't stated or clearly implied by the instruction itself.
- If the instruction is already small and atomic, it's fine to add it as a single task — don't force artificial splitting.
- If part of the instruction is ambiguous or missing information needed to make it executable, still add it, but flag the ambiguity plainly in the task text rather than guessing or inventing a requirement to fill the gap.

## Step 4 — Append to NEXT

- Add the new tasks to the end of `## NEXT` in `TASKS.md`, in the order determined above, using the same list style already used in that file.
- If `## NEXT` currently only contains a placeholder line (e.g. "_(empty — ...)_"), replace that placeholder with the new task list.
- If `## NEXT` already has tasks queued, append after them — do not reorder existing NEXT items, and do not interleave new tasks ahead of existing ones unless the pasted instruction explicitly says it's urgent/blocking.

## Step 5 — Report and stop

Report back to Siam:
- How many tasks were added, and their titles in order.
- Any ambiguity/assumption flags raised in Step 3.
- Confirmation that `## CURRENT`, `## BLOCKED`, `## NEEDS_SIAM`, and `## DONE` were left untouched.

Then stop. Do not start coding, do not run `inkbook-run`, do not touch application code — this skill's job ends when `TASKS.md` is saved and reported.

## Guardrails

- Never write or edit any file other than `TASKS.md`.
- Never start implementation work, even for a task that looks trivial.
- Never mark anything DONE.
- Never invent requirements, acceptance criteria, or scope not present in the pasted instruction.
- Never modify `## CURRENT` — if the pasted instruction seems to conflict with or supersede the current task, still queue it under `## NEXT` and mention the potential conflict in the report; let Siam or `inkbook-run` decide, don't decide for them.
