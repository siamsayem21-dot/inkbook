import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAdminClient, getAnonClient, provisionStudioGraph, teardownStudioGraph, testTag, type StudioGraph } from "./helpers";

let studioA: StudioGraph;
let studioB: StudioGraph;

beforeAll(async () => {
  studioA = await provisionStudioGraph(testTag());
  studioB = await provisionStudioGraph(testTag());
});

afterAll(async () => {
  await teardownStudioGraph(studioA);
  await teardownStudioGraph(studioB);
});

describe("cross-studio isolation (owner)", () => {
  it("owner A can see their own studio's clients", async () => {
    const client = getAnonClient(studioA.ownerAccessToken);
    const { data, error } = await client.from("clients").select("id").eq("id", studioA.clientId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("owner A cannot see studio B's clients", async () => {
    const client = getAnonClient(studioA.ownerAccessToken);
    const { data, error } = await client.from("clients").select("id").eq("id", studioB.clientId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("owner A cannot see studio B's bookings", async () => {
    const client = getAnonClient(studioA.ownerAccessToken);
    const { data, error } = await client.from("bookings").select("id").eq("id", studioB.bookingId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("owner A cannot update studio B's studio row", async () => {
    const client = getAnonClient(studioA.ownerAccessToken);
    const { data } = await client
      .from("studios")
      .update({ name: "hijacked" })
      .eq("id", studioB.studioId)
      .select();
    // RLS silently filters the row out of the update's USING clause — 0 rows affected
    expect(data).toHaveLength(0);

    const admin = getAdminClient();
    const { data: check } = await admin.from("studios").select("name").eq("id", studioB.studioId).single();
    expect(check?.name).not.toBe("hijacked");
  });
});

describe("cross-studio isolation (artist)", () => {
  it("artist A can see their own booking", async () => {
    const client = getAnonClient(studioA.artistAccessToken);
    const { data, error } = await client.from("bookings").select("id").eq("id", studioA.bookingId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("artist A cannot see studio B's booking", async () => {
    const client = getAnonClient(studioA.artistAccessToken);
    const { data, error } = await client.from("bookings").select("id").eq("id", studioB.bookingId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("artist A cannot see studio B's clients (not their own studio or self)", async () => {
    const client = getAnonClient(studioA.artistAccessToken);
    const { data, error } = await client.from("clients").select("id").eq("id", studioB.clientId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("public (unauthenticated) access matches the documented policy shape", () => {
  it("anon can read studios (public booking-page lookup policy)", async () => {
    const client = getAnonClient();
    const { data, error } = await client.from("studios").select("id").eq("id", studioA.studioId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("anon can insert a client record (public booking flow)", async () => {
    const client = getAnonClient();
    const { data, error } = await client
      .from("clients")
      .insert({ studio_id: studioA.studioId, full_name: "Anon Client", email: "anon@example.test", phone: "5551110000" })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    if (data?.id) await getAdminClient().from("clients").delete().eq("id", data.id);
  });

  it("anon cannot read bookings directly (no public SELECT policy on bookings)", async () => {
    const client = getAnonClient();
    const { data, error } = await client.from("bookings").select("id").eq("id", studioA.bookingId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("anon cannot read the blacklist (no public SELECT policy)", async () => {
    const client = getAnonClient();
    const { data, error } = await client.from("blacklist").select("id").eq("studio_id", studioA.studioId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
