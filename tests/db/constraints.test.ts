import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAdminClient, provisionStudioGraph, teardownStudioGraph, testTag, type StudioGraph } from "./helpers";

const admin = getAdminClient();
let graph: StudioGraph;

beforeAll(async () => {
  graph = await provisionStudioGraph(testTag());
});

afterAll(async () => {
  await teardownStudioGraph(graph);
});

describe("unique constraint violations", () => {
  it("rejects a duplicate studio subdomain", async () => {
    const { data: existing } = await admin.from("studios").select("subdomain").eq("id", graph.studioId).single();
    const { error } = await admin.from("studios").insert({
      name: "Dup", subdomain: existing!.subdomain, owner_id: graph.ownerUserId, deposit_amount_cents: 5000,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23505");
  });

  it("rejects a second artist row for the same auth user", async () => {
    const { error } = await admin.from("artists").insert({
      studio_id: graph.studioId, user_id: graph.artistUserId, name: "Dup Artist", email: "dup@example.test",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23505");
  });

  it("rejects a second deposits row for the same booking", async () => {
    const { error: firstErr } = await admin.from("deposits").insert({
      booking_id: graph.bookingId, amount_cents: 10000,
    });
    expect(firstErr).toBeNull();

    const { error: dupErr } = await admin.from("deposits").insert({
      booking_id: graph.bookingId, amount_cents: 10000,
    });
    expect(dupErr).not.toBeNull();
    expect(dupErr!.code).toBe("23505");
  });

  it("rejects a duplicate waitlist (artist_id, client_id) pair", async () => {
    const { error: firstErr } = await admin.from("waitlist").insert({
      studio_id: graph.studioId, artist_id: graph.artistId, client_id: graph.clientId,
    });
    expect(firstErr).toBeNull();

    const { error: dupErr } = await admin.from("waitlist").insert({
      studio_id: graph.studioId, artist_id: graph.artistId, client_id: graph.clientId,
    });
    expect(dupErr).not.toBeNull();
    expect(dupErr!.code).toBe("23505");
  });
});

describe("foreign key violations", () => {
  it("rejects a booking with a nonexistent artist_id", async () => {
    const { error } = await admin.from("bookings").insert({
      studio_id: graph.studioId,
      artist_id: "00000000-0000-0000-0000-000000000000",
      client_id: graph.clientId,
      date: "2027-02-01", time: "10:00", style: "Test", deposit_amount_cents: 10000,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23503");
  });

  it("rejects a booking with a nonexistent client_id", async () => {
    const { error } = await admin.from("bookings").insert({
      studio_id: graph.studioId,
      artist_id: graph.artistId,
      client_id: "00000000-0000-0000-0000-000000000000",
      date: "2027-02-01", time: "10:00", style: "Test", deposit_amount_cents: 10000,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23503");
  });
});

describe("check constraint violations", () => {
  it("rejects an invalid studios.plan value", async () => {
    const { error } = await admin.from("studios").insert({
      name: "Bad Plan", subdomain: `${testTag()}-badplan`, owner_id: graph.ownerUserId,
      deposit_amount_cents: 5000, plan: "enterprise",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23514");
  });

  it("rejects a minor consent form with no guardian info", async () => {
    const { error } = await admin.from("consent_forms").insert({
      booking_id: graph.bookingId, client_id: graph.clientId,
      is_minor: true, client_signature: "sig", id_photo_url: "x", state_template: "CA",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23514");
  });

  it("rejects a blacklist entry with neither email nor phone", async () => {
    const { error } = await admin.from("blacklist").insert({
      studio_id: graph.studioId, blocked_by: graph.ownerUserId,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23514");
  });
});
