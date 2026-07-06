import { describe, it, expect } from "vitest";
import { getAdminClient, provisionStudioGraph, teardownStudioGraph, testTag } from "./helpers";

const admin = getAdminClient();

describe("ON DELETE CASCADE", () => {
  it("deleting a studio cascades to artists, clients, bookings, deposits, and consent forms", async () => {
    const graph = await provisionStudioGraph(testTag());

    await admin.from("deposits").insert({ booking_id: graph.bookingId, amount_cents: 10000 });
    await admin.from("consent_forms").insert({
      booking_id: graph.bookingId, client_id: graph.clientId,
      client_signature: "sig", id_photo_url: "x", state_template: "CA",
    });

    const { error: deleteErr } = await admin.from("studios").delete().eq("id", graph.studioId);
    expect(deleteErr).toBeNull();

    const [artists, clients, bookings, deposits, consentForms] = await Promise.all([
      admin.from("artists").select("id").eq("id", graph.artistId),
      admin.from("clients").select("id").eq("id", graph.clientId),
      admin.from("bookings").select("id").eq("id", graph.bookingId),
      admin.from("deposits").select("id").eq("booking_id", graph.bookingId),
      admin.from("consent_forms").select("id").eq("booking_id", graph.bookingId),
    ]);
    expect(artists.data).toHaveLength(0);
    expect(clients.data).toHaveLength(0);
    expect(bookings.data).toHaveLength(0);
    expect(deposits.data).toHaveLength(0);
    expect(consentForms.data).toHaveLength(0);

    // Studio's gone but the auth users are orphaned artifacts of this test — clean up directly.
    await admin.auth.admin.deleteUser(graph.ownerUserId).catch(() => {});
    await admin.auth.admin.deleteUser(graph.artistUserId).catch(() => {});
  });

  it("deleting the owner auth user cascades all the way through to bookings", async () => {
    const graph = await provisionStudioGraph(testTag());

    const { error: deleteErr } = await admin.auth.admin.deleteUser(graph.ownerUserId);
    expect(deleteErr).toBeNull();

    const [studios, bookings] = await Promise.all([
      admin.from("studios").select("id").eq("id", graph.studioId),
      admin.from("bookings").select("id").eq("id", graph.bookingId),
    ]);
    expect(studios.data).toHaveLength(0);
    expect(bookings.data).toHaveLength(0);

    await admin.auth.admin.deleteUser(graph.artistUserId).catch(() => {});
  });
});

describe("ON DELETE RESTRICT", () => {
  it("refuses to delete an artist who still has a booking", async () => {
    const graph = await provisionStudioGraph(testTag());

    const { error } = await admin.from("artists").delete().eq("id", graph.artistId);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23503");

    await teardownStudioGraph(graph);
  });

  it("refuses to delete a client who still has a booking", async () => {
    const graph = await provisionStudioGraph(testTag());

    const { error } = await admin.from("clients").delete().eq("id", graph.clientId);
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23503");

    await teardownStudioGraph(graph);
  });

  it("allows deleting an artist once their bookings are gone", async () => {
    const graph = await provisionStudioGraph(testTag());

    await admin.from("bookings").delete().eq("id", graph.bookingId);
    const { error } = await admin.from("artists").delete().eq("id", graph.artistId);
    expect(error).toBeNull();

    await teardownStudioGraph(graph);
  });
});
