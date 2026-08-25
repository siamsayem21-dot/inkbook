# InkBook — Interaction Coverage

Per-control interaction log. Populated incrementally as each route is
exercised (not pre-populated up front — the mission's own guidance is to
discover controls at runtime via the actual DOM/accessibility tree, not
guess them from JSX in advance). Format per entry:

`ROLE | ROUTE | UI STATE | CONTROL | TYPE | EXPECTED | METHOD | STATUS | EVIDENCE`

Entries are grouped by phase/route as they're completed. See
`EXHAUSTIVE_QA_MASTER.md` for the current phase/next-item pointer.

---

## Phase A — Auth
(populated during Phase A execution)

## Phase B — Owner Portal
(populated during Phase B execution)

## Phase C — Artist Portal
(populated during Phase C execution)

## Phase D — Client Portal
(populated during Phase D execution)

## Phase E — Public / White-label
(populated during Phase E execution)

## Phase F-N — Core Journeys (AI, Match, Quote, Stripe, Booking, Consent, Agreement, Remainder, Messages, Portfolio/Flash)
(populated during those phases)

## Phase O-R — Blacklist, Waitlist, Automations, Reviews
(populated during those phases)
