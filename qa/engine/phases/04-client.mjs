// Phase 04 — Client Portal. Same shape as Artist: fast targeted verify-*.mjs
// scripts in `critical`, nothing extra in `full` yet — there is no
// dedicated Client Portal full-click-through script in this project's
// history (client coverage instead came from the Flagship journey, which
// walks the real client-facing flow end to end). Documented as a known gap
// in QA_ENGINE.md rather than silently implied to exist.
import { runCheck, nodeScript } from "../lib/exec.mjs";

const SCRIPTS = [
  ["client.bookings", "scripts/verify-client-bookings.mjs", "Client Portal My Bookings"],
  ["client.history", "scripts/verify-client-history.mjs", "Client Portal History"],
  ["client.settings", "scripts/verify-client-settings.mjs", "Client Portal Settings"],
  ["client.messaging", "scripts/verify-messaging.mjs", "Client <-> Studio messaging"],
  ["client.booking-lifecycle", "scripts/verify-booking-lifecycle.mjs", "Booking lifecycle completion"],
  ["client.remainder-payment", "scripts/verify-remainder-payment.mjs", "Remaining balance payment"],
  ["client.reviews", "scripts/verify-reviews.mjs", "Reviews"],
  ["client.waitlist", "scripts/verify-waitlist.mjs", "Waitlist"],
  // ~13 real Claude API turns end-to-end (multi-turn conversation, refresh,
  // owner cross-check) — measured 80-130s for the AI turns alone locally;
  // budget generously for production latency headroom.
  ["client.consultation-anti-loop", "scripts/verify-consultation-anti-loop.mjs", "AI Consultation real multi-turn conversation (anti-loop regression, P1)", 5 * 60 * 1000],
];

export async function run(mode) {
  if (mode === "smoke") return [];

  const results = [];
  for (const [id, script, label, timeoutMs] of SCRIPTS) {
    results.push(await runCheck({ id, label, ...nodeScript(script), timeoutMs: timeoutMs ?? 60000 }));
  }
  return results;
}
