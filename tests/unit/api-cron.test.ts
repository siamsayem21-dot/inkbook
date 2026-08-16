import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn((type: string) => `sms:${type}`),
}));
vi.mock("@/lib/email", () => ({
  sendAppointmentReminderEmail: vi.fn(() => Promise.resolve(true)),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { trySendSms } from "@/lib/twilio/client";
import { sendAppointmentReminderEmail } from "@/lib/email";
import { GET as noShowGET } from "@/app/api/cron/no-show/route";
import { GET as remindersGET } from "@/app/api/cron/sms-reminders/route";

let sb: SupabaseMock;

function cronRequest(url: string, authorized = true) {
  return new NextRequest(url, {
    headers: authorized ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
}

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(trySendSms).mockClear();
  vi.mocked(sendAppointmentReminderEmail).mockClear();
});

describe("GET /api/cron/no-show", () => {
  it("401s without the correct CRON_SECRET bearer token", async () => {
    const res = await noShowGET(cronRequest("http://localhost/api/cron/no-show", false));
    expect(res.status).toBe(401);
  });

  it("returns updated:0 when there are no overdue confirmed bookings", async () => {
    sb.queueFrom("bookings", []);
    const res = await noShowGET(cronRequest("http://localhost/api/cron/no-show"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ updated: 0, bookings: [] });
  });

  it("500s when the overdue-bookings fetch fails", async () => {
    sb.queueFrom("bookings", null, { message: "db error" });
    const res = await noShowGET(cronRequest("http://localhost/api/cron/no-show"));
    expect(res.status).toBe(500);
  });

  it("marks overdue confirmed bookings as no_show and keeps the deposit", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1" }, { id: "bk-2" }]); // overdue fetch
    sb.queueFrom("bookings", { success: true }); // update
    const res = await noShowGET(cronRequest("http://localhost/api/cron/no-show"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ updated: 2, bookings: ["bk-1", "bk-2"] });
    const updateChain = sb.getChain("bookings");
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "no_show", deposit_kept: true })
    );
    expect(updateChain.in).toHaveBeenCalledWith("id", ["bk-1", "bk-2"]);
  });

  it("500s when the no_show update fails", async () => {
    sb.queueFrom("bookings", [{ id: "bk-1" }]);
    sb.queueFrom("bookings", null, { message: "update failed" });
    const res = await noShowGET(cronRequest("http://localhost/api/cron/no-show"));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/cron/sms-reminders", () => {
  // Anchored so "today" (day-of) and "48 hours out" resolve to fixed,
  // predictable dates in UTC — 2026-08-02 and 2026-08-04 respectively.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function candidateRow(overrides: Partial<{
    id: string; client_id: string; artist_id: string; studio_id: string;
    date: string; time: string;
    sms_48hr_sent: boolean; email_48hr_sent: boolean;
    sms_day_of_sent: boolean; email_day_of_sent: boolean;
  }> = {}) {
    return {
      id: "bk-1",
      client_id: "c1",
      artist_id: "a1",
      studio_id: "s1",
      date: "2026-08-04",
      time: "14:00:00",
      sms_48hr_sent: false,
      email_48hr_sent: false,
      sms_day_of_sent: false,
      email_day_of_sent: false,
      ...overrides,
    };
  }

  it("401s without the correct CRON_SECRET bearer token", async () => {
    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders", false));
    expect(res.status).toBe(401);
  });

  it("filters the candidate query on status=confirmed and deposit_paid=true", async () => {
    sb.queueFrom("bookings", []);
    await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));

    const selectChain = sb.getChain("bookings", 1);
    expect(selectChain.eq).toHaveBeenCalledWith("status", "confirmed");
    expect(selectChain.eq).toHaveBeenCalledWith("deposit_paid", true);
  });

  it("sends SMS + email 48hr and day-of reminders and marks all four flags", async () => {
    sb.queueFrom("bookings", [
      candidateRow({ id: "bk-48", client_id: "c1", artist_id: "a1", date: "2026-08-04", time: "14:00:00" }),
      candidateRow({ id: "bk-dayof", client_id: "c2", artist_id: "a2", date: "2026-08-02", time: "10:00:00" }),
    ]);

    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(false); // is_client_blacklisted -> not blocked
    sb.queueFrom("bookings", { success: true }); // mark sms_48hr_sent
    sb.queueFrom("bookings", { success: true }); // mark email_48hr_sent

    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "John Smith", email: "john@example.com", phone: "5552220000" });
    sb.queueFrom("artists", { name: "Sam" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_day_of_sent
    sb.queueFrom("bookings", { success: true }); // mark email_day_of_sent

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 1, sentDayOf: 1 });
    expect(trySendSms).toHaveBeenCalledWith("5551110000", "sms:48hr_reminder");
    expect(trySendSms).toHaveBeenCalledWith("5552220000", "sms:day_of_reminder");
    expect(sendAppointmentReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com", clientName: "Jane Doe", reminderType: "48hr" })
    );
    expect(sendAppointmentReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "john@example.com", clientName: "John Smith", reminderType: "day_of" })
    );
  });

  it("respects the studio's timezone instead of the server's UTC date", async () => {
    // System clock is 2026-08-02T03:00:00Z. In Honolulu (UTC-10) that's
    // still 2026-08-01 local — so a booking dated 2026-08-01 is that
    // studio's "day-of" reminder, even though the server's own UTC date
    // has already rolled over to 2026-08-02.
    vi.setSystemTime(new Date("2026-08-02T03:00:00.000Z"));

    sb.queueFrom("bookings", [
      candidateRow({ id: "bk-hi", date: "2026-08-01" }),
    ]);
    sb.queueFrom("studios", { name: "Aloha Ink", address: null, timezone: "Pacific/Honolulu" });
    sb.queueFrom("clients", { full_name: "Kai", email: "kai@example.com", phone: "8085550000" });
    sb.queueFrom("artists", { name: "Leilani" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_day_of_sent
    sb.queueFrom("bookings", { success: true }); // mark email_day_of_sent

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 1 });
    expect(trySendSms).toHaveBeenCalledWith("8085550000", "sms:day_of_reminder");
  });

  it("skips a booking whose date doesn't match either target date for its studio's timezone", async () => {
    sb.queueFrom("bookings", [candidateRow({ date: "2026-08-03" })]); // neither today nor +2d
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 0 });
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
  });

  it("sends only the SMS when the client has no email on file", async () => {
    sb.queueFrom("bookings", [candidateRow()]);
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: null, phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_48hr_sent

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 1, sentDayOf: 0 });
    expect(trySendSms).toHaveBeenCalledWith("5551110000", "sms:48hr_reminder");
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
  });

  it("skips a reminder entirely when the client has neither phone nor email on file", async () => {
    sb.queueFrom("bookings", [candidateRow()]);
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: null, phone: null });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(false);

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 0 });
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
  });

  it("skips both channels for a blacklisted client without marking any flag", async () => {
    sb.queueFrom("bookings", [candidateRow()]);
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(true); // is_client_blacklisted -> blocked

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 0 });
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    // Only the initial select for "bookings" — no update calls attempted.
    expect(sb.fromCalls.filter((t) => t === "bookings")).toHaveLength(1);
  });

  it("only retries the channel that hasn't been sent yet", async () => {
    sb.queueFrom("bookings", [candidateRow({ sms_48hr_sent: true, email_48hr_sent: false })]);
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark email_48hr_sent

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 1, sentDayOf: 0 });
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAppointmentReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com" })
    );
  });

  it("does not mark email_*_sent when the email fails to deliver", async () => {
    sb.queueFrom("bookings", [candidateRow()]);
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_48hr_sent
    // No further "bookings" result queued for email — asserting below that
    // no update is attempted when delivery fails means nothing should
    // consume it anyway.
    vi.mocked(sendAppointmentReminderEmail).mockResolvedValueOnce(false);

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 1, sentDayOf: 0 }); // notified via SMS only
    expect(trySendSms).toHaveBeenCalledWith("5551110000", "sms:48hr_reminder");
    // Only the initial select + the SMS mark — no third "bookings" call for email.
    expect(sb.fromCalls.filter((t) => t === "bookings")).toHaveLength(2);
  });

  it("keeps processing later bookings when an earlier one's email send throws", async () => {
    sb.queueFrom("bookings", [
      candidateRow({ id: "bk-fail", client_id: "c1", date: "2026-08-04" }), // 48hr
      candidateRow({ id: "bk-ok", client_id: "c2", date: "2026-08-02" }), // day_of
    ]);

    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: null });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(false);
    // sendAppointmentReminderEmail throws for this booking — no phone, so no
    // SMS fallback and no "bookings" update should be queued/consumed for it.

    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "John Smith", email: "john@example.com", phone: null });
    sb.queueFrom("artists", { name: "Sam" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark email_day_of_sent for bk-ok

    vi.mocked(sendAppointmentReminderEmail)
      .mockRejectedValueOnce(new Error("Resend is down"))
      .mockResolvedValueOnce(true);

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 1 });
    expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(2);
  });

  // Timezone Fix 6/7 — regressions for the defensive handling added in
  // Timezone Fix 4/7 (app/api/cron/sms-reminders/route.ts). These cover the
  // exact production failure mode: studios.timezone missing/invalid must not
  // silently break every reminder, nor crash the whole cron run.

  it("protects against a studio lookup error (e.g. a missing column) — skips only that booking and still processes the next one", async () => {
    sb.queueFrom("bookings", [
      candidateRow({ id: "bk-bad-studio", client_id: "c1", date: "2026-08-04" }), // 48hr
      candidateRow({ id: "bk-ok", client_id: "c2", date: "2026-08-02" }), // day_of
    ]);

    // Simulates the real production failure: column doesn't exist yet.
    sb.queueFrom("studios", null, { message: "column studios.timezone does not exist" });
    // No client/artist/rpc calls should happen for bk-bad-studio.

    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "John Smith", email: "john@example.com", phone: "5552220000" });
    sb.queueFrom("artists", { name: "Sam" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_day_of_sent
    sb.queueFrom("bookings", { success: true }); // mark email_day_of_sent

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 1 });
    expect(trySendSms).toHaveBeenCalledTimes(1);
    expect(trySendSms).toHaveBeenCalledWith("5552220000", "sms:day_of_reminder");
  });

  it("protects against an invalid (non-IANA) timezone string — skips only that booking and still processes the next one", async () => {
    sb.queueFrom("bookings", [
      candidateRow({ id: "bk-bad-tz", client_id: "c1", date: "2026-08-04" }), // 48hr
      candidateRow({ id: "bk-ok", client_id: "c2", date: "2026-08-02" }), // day_of
    ]);

    // Column exists and the row is well-formed — the value itself is just
    // not a real IANA identifier, which Intl.DateTimeFormat rejects.
    sb.queueFrom("studios", { name: "Bad TZ Studio", address: null, timezone: "Not/A/Real/Zone" });

    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "UTC" });
    sb.queueFrom("clients", { full_name: "John Smith", email: "john@example.com", phone: "5552220000" });
    sb.queueFrom("artists", { name: "Sam" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_day_of_sent
    sb.queueFrom("bookings", { success: true }); // mark email_day_of_sent

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 1 });
    expect(trySendSms).toHaveBeenCalledTimes(1);
    expect(trySendSms).toHaveBeenCalledWith("5552220000", "sms:day_of_reminder");
  });

  it("falls back to UTC when a studio's timezone is an empty string, instead of failing that booking", async () => {
    sb.queueFrom("bookings", [candidateRow({ date: "2026-08-02" })]); // day_of under UTC
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St", timezone: "" });
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_day_of_sent
    sb.queueFrom("bookings", { success: true }); // mark email_day_of_sent

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 1 });
    expect(trySendSms).toHaveBeenCalledWith("5551110000", "sms:day_of_reminder");
  });
});
