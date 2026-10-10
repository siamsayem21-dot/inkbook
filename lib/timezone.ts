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

// InkBook sells to USA + Canada, so their zones go first instead of making an
// owner scroll past every Africa/* entry. Only zones this runtime actually
// knows are included, and each appears once in the final list.
const NORTH_AMERICA_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Winnipeg",
  "America/Regina",
  "America/Edmonton",
  "America/Vancouver",
  "America/Halifax",
  "America/St_Johns",
].filter(isValidIanaTimezone);

// UTC prepended — it's a valid, commonly expected value (and studios.timezone's
// own DB default) but Intl.supportedValuesOf('timeZone') omits it, so it
// wouldn't otherwise appear as a selectable option.
export function sortedIanaTimezones(): string[] {
  const featured = new Set(NORTH_AMERICA_ZONES);
  return ["UTC"]
    .concat(NORTH_AMERICA_ZONES)
    .concat(CANONICAL_ZONES.filter((tz) => !featured.has(tz)));
}
