import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/twilio/client", () => ({
  trySendSms: vi.fn(() => Promise.resolve()),
  buildSmsMessage: vi.fn((type: string) => `sms:${type}`),
}));
vi.mock("@/lib/email", () => ({
  sendAppointmentReminderEmail: vi.fn(() => Promise.resolve()),
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
  it("401s without the correct CRON_SECRET bearer token", async () => {
    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders", false));
    expect(res.status).toBe(401);
  });

  it("sends SMS + email 48hr and day-of reminders and marks all four flags", async () => {
    sb.queueFrom("bookings", [
      { id: "bk-48", client_id: "c1", artist_id: "a1", studio_id: "s1", date: "2026-08-04", time: "14:00:00", sms_sent: false, email_sent: false },
    ]); // 48hr query
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });
    sb.queueRpc(false); // is_client_blacklisted -> not blocked
    sb.queueFrom("bookings", { success: true }); // mark email_48hr_sent
    sb.queueFrom("bookings", { success: true }); // mark sms_48hr_sent

    sb.queueFrom("bookings", [
      { id: "bk-dayof", client_id: "c2", artist_id: "a2", studio_id: "s1", date: "2026-08-02", time: "10:00:00", sms_sent: false, email_sent: false },
    ]); // day-of query
    sb.queueFrom("clients", { full_name: "John Smith", email: "john@example.com", phone: "5552220000" });
    sb.queueFrom("artists", { name: "Sam" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark email_day_of_sent
    sb.queueFrom("bookings", { success: true }); // mark sms_day_of_sent

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

  it("sends only the SMS when the client has no email on file", async () => {
    sb.queueFrom("bookings", [
      { id: "bk-48", client_id: "c1", artist_id: "a1", studio_id: "s1", date: "2026-08-04", time: "14:00:00", sms_sent: false, email_sent: false },
    ]);
    sb.queueFrom("clients", { full_name: "Jane Doe", email: null, phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark sms_48hr_sent

    sb.queueFrom("bookings", []); // no day-of bookings

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 1, sentDayOf: 0 });
    expect(trySendSms).toHaveBeenCalledWith("5551110000", "sms:48hr_reminder");
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
  });

  it("skips a reminder entirely when the client has neither phone nor email on file", async () => {
    sb.queueFrom("bookings", [
      { id: "bk-48", client_id: "c1", artist_id: "a1", studio_id: "s1", date: "2026-08-04", time: "14:00:00", sms_sent: false, email_sent: false },
    ]);
    sb.queueFrom("clients", { full_name: "Jane Doe", email: null, phone: null });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });
    sb.queueRpc(false);

    sb.queueFrom("bookings", []); // no day-of bookings

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 0 });
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
  });

  it("skips both channels for a blacklisted client without marking any flag", async () => {
    sb.queueFrom("bookings", [
      { id: "bk-48", client_id: "c1", artist_id: "a1", studio_id: "s1", date: "2026-08-04", time: "14:00:00", sms_sent: false, email_sent: false },
    ]);
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });
    sb.queueRpc(true); // is_client_blacklisted -> blocked

    sb.queueFrom("bookings", []); // no day-of bookings

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 0, sentDayOf: 0 });
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
    // Only the initial select for "bookings" — no update calls attempted.
    expect(sb.fromCalls.filter((t) => t === "bookings")).toHaveLength(2);
  });

  it("only retries the channel that hasn't been sent yet", async () => {
    sb.queueFrom("bookings", [
      { id: "bk-48", client_id: "c1", artist_id: "a1", studio_id: "s1", date: "2026-08-04", time: "14:00:00", sms_sent: true, email_sent: false },
    ]);
    sb.queueFrom("clients", { full_name: "Jane Doe", email: "jane@example.com", phone: "5551110000" });
    sb.queueFrom("artists", { name: "Alex" });
    sb.queueFrom("studios", { name: "Ink & Iron", address: "123 Main St" });
    sb.queueRpc(false);
    sb.queueFrom("bookings", { success: true }); // mark email_48hr_sent

    sb.queueFrom("bookings", []); // no day-of bookings

    const res = await remindersGET(cronRequest("http://localhost/api/cron/sms-reminders"));
    const body = await res.json();
    expect(body).toEqual({ sent48hr: 1, sentDayOf: 0 });
    expect(trySendSms).not.toHaveBeenCalled();
    expect(sendAppointmentReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@example.com" })
    );
  });
});
