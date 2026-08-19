import type { ErrorEvent } from "@sentry/nextjs";

// Defense-in-depth beyond Sentry.init({ sendDefaultPii: false }) -- strips
// anything that looks like a secret/credential/payment value from whatever
// does get sent (breadcrumbs, extra context), in case a raw error message
// or a manually-attached context object happens to include one.
const SENSITIVE_KEY_PATTERN = /pass|token|secret|authoriz|api[_-]?key|card|cvc|ssn|ein/i;

export function scrubObject<T>(value: T): T {
  if (Array.isArray(value)) return value.map(scrubObject) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[Filtered]" : scrubObject(val);
    }
    return out as T;
  }
  return value;
}

export function scrubSensitiveData(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      delete headers.authorization;
      delete headers.cookie;
      event.request.headers = headers;
    }
  }
  if (event.extra) event.extra = scrubObject(event.extra);
  if (event.contexts) event.contexts = scrubObject(event.contexts);
  return event;
}
