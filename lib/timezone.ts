// Single source of truth for IANA timezone validation, shared by studio
// creation (app/api/studios/route.ts) and Owner Settings
// (app/(owner)/owner/settings/studio/actions.ts) — both write to the same
// studios.timezone column, so both validate against the same logic instead
// of each inventing their own check.

// Validates by attempting to actually construct an Intl.DateTimeFormat with
// the value as `timeZone` — the exact same check the SMS reminder cron's
// own localDateString() performs (app/api/cron/sms-reminders/route.ts).
// This is deliberately NOT a plain Intl.supportedValuesOf('timeZone')
// allowlist: that enumeration excludes 'UTC' itself (confirmed — 'UTC' is
// not in its returned list, in both Node and Chromium) even though it's a
// fully valid, resolvable timeZone value and is the column's own DEFAULT.
// Validating the same way the cron does guarantees "valid" here always
// means "the cron will accept it too."
export function isValidIanaTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const CANONICAL_ZONES = Array.from(new Set(Intl.supportedValuesOf("timeZone"))).sort();

// UTC prepended — it's a valid, commonly expected value (and studios.timezone's
// own DB default) but Intl.supportedValuesOf('timeZone') omits it, so it
// wouldn't otherwise appear as a selectable option.
export function sortedIanaTimezones(): string[] {
  return ["UTC"].concat(CANONICAL_ZONES);
}
