import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getAdminClient,
  provisionStudioGraph,
  teardownStudioGraph,
  createAuthUser,
  deleteAuthUser,
  testTag,
  type StudioGraph,
} from "./helpers";

// Regression coverage for the Artist Consultations privacy fix
// (app/(artist)/artist/consultations/page.tsx, [id]/page.tsx, actions.ts):
// a consultation assigned to a different artist must never be visible to
// another artist, even one at the same studio, while an unassigned
// consultation must remain visible/claimable by anyone at the studio.
//
// These tests replicate the exact query shape the app code uses
// (createAdminClient() + .eq("studio_id", ...).or("artist_id.eq.X,artist_id.is.null"))
// rather than going through RLS/anon clients — the app never queries
// consultations through RLS (every code path uses the service-role admin
// client with manual studio/artist filters), so RLS-based assertions
// wouldn't actually exercise the fix under test here.

let studioA: StudioGraph;
let studioB: StudioGraph;
let artistA2Id: string;
let artistA2UserId: string;

let consultAssignedToA: string;
let consultUnassigned: string;
let consultAssignedToA2: string;
let consultAtStudioB: string;

beforeAll(async () => {
  const tag = testTag();
  studioA = await provisionStudioGraph(`${tag}-a`);
  studioB = await provisionStudioGraph(`${tag}-b`);

  const admin = getAdminClient();

  // A second, unrelated artist at studioA — used for the "different artist,
  // same studio" case.
  const { userId, accessToken: _unused } = await createAuthUser(`${tag}-artist2@example.test`, "Password123!");
  artistA2UserId = userId;
  const { data: artist2, error: artist2Err } = await admin
    .from("artists")
    .insert({
      studio_id: studioA.studioId,
      user_id: artistA2UserId,
      name: `${tag} Artist 2`,
      email: `${tag}-artist2@example.test`,
    })
    .select("id")
    .single();
  if (artist2Err || !artist2) throw new Error(`provision artist2 failed: ${artist2Err?.message}`);
  artistA2Id = artist2.id;

  const baseConsult = {
    studio_id: studioA.studioId,
    client_name: `${tag} Client`,
    client_email: `${tag}-client@example.test`,
    client_phone: "5550000000",
    tattoo_description: "Test piece",
    placement: "Forearm",
    estimated_size: "Small",
    color_preference: "black_grey",
    budget_range: "$200-$400",
    status: "new",
  };

  const { data: c1 } = await admin.from("consultations").insert({ ...baseConsult, artist_id: studioA.artistId }).select("id").single();
  consultAssignedToA = c1!.id;

  const { data: c2 } = await admin.from("consultations").insert({ ...baseConsult, artist_id: null }).select("id").single();
  consultUnassigned = c2!.id;

  const { data: c3 } = await admin.from("consultations").insert({ ...baseConsult, artist_id: artistA2Id }).select("id").single();
  consultAssignedToA2 = c3!.id;

  const { data: c4 } = await admin
    .from("consultations")
    .insert({ ...baseConsult, studio_id: studioB.studioId, artist_id: studioB.artistId })
    .select("id")
    .single();
  consultAtStudioB = c4!.id;
});

afterAll(async () => {
  const admin = getAdminClient();
  await admin.from("consultations").delete().in("id", [consultAssignedToA, consultUnassigned, consultAssignedToA2, consultAtStudioB]);
  await deleteAuthUser(artistA2UserId);
  await teardownStudioGraph(studioA);
  await teardownStudioGraph(studioB);
});

// Mirrors the exact query in app/(artist)/artist/consultations/page.tsx
async function listForArtist(studioId: string, artistId: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from("consultations")
    .select("id, artist_id")
    .eq("studio_id", studioId)
    .or(`artist_id.eq.${artistId},artist_id.is.null`);
  return (data ?? []).map((r) => r.id as string);
}

// Mirrors the exact query in app/(artist)/artist/consultations/[id]/page.tsx
async function detailForArtist(consultId: string, studioId: string, artistId: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from("consultations")
    .select("id")
    .eq("id", consultId)
    .eq("studio_id", studioId)
    .or(`artist_id.eq.${artistId},artist_id.is.null`)
    .maybeSingle();
  return data;
}

describe("Artist Consultations — own vs. unassigned consultations are visible", () => {
  it("own assigned consultation appears in the artist's list", async () => {
    const ids = await listForArtist(studioA.studioId, studioA.artistId);
    expect(ids).toContain(consultAssignedToA);
  });

  it("unassigned consultation appears in the artist's list", async () => {
    const ids = await listForArtist(studioA.studioId, studioA.artistId);
    expect(ids).toContain(consultUnassigned);
  });

  it("own assigned consultation is reachable via the detail query", async () => {
    const row = await detailForArtist(consultAssignedToA, studioA.studioId, studioA.artistId);
    expect(row).not.toBeNull();
  });

  it("unassigned consultation is reachable via the detail query", async () => {
    const row = await detailForArtist(consultUnassigned, studioA.studioId, studioA.artistId);
    expect(row).not.toBeNull();
  });
});

describe("Artist Consultations — another artist's consultation is fully hidden", () => {
  it("a consultation assigned to a different artist is absent from the list", async () => {
    const ids = await listForArtist(studioA.studioId, studioA.artistId);
    expect(ids).not.toContain(consultAssignedToA2);
  });

  it("a consultation assigned to a different artist's direct URL returns not-found (null)", async () => {
    const row = await detailForArtist(consultAssignedToA2, studioA.studioId, studioA.artistId);
    expect(row).toBeNull();
  });

  it("the other artist can see their own assigned consultation (sanity check — the filter is per-caller, not a blanket lock)", async () => {
    const ids = await listForArtist(studioA.studioId, artistA2Id);
    expect(ids).toContain(consultAssignedToA2);
  });
});

describe("Artist Consultations — cross-studio isolation", () => {
  it("a different studio's consultation is absent from the list", async () => {
    const ids = await listForArtist(studioA.studioId, studioA.artistId);
    expect(ids).not.toContain(consultAtStudioB);
  });

  it("a different studio's consultation direct URL returns not-found (null)", async () => {
    const row = await detailForArtist(consultAtStudioB, studioA.studioId, studioA.artistId);
    expect(row).toBeNull();
  });
});

describe("Artist Consultations — unassigned claim workflow still works", () => {
  it("saving a quote on an unassigned consultation claims it for the saving artist", async () => {
    const admin = getAdminClient();

    // Mirrors saveArtistConsultationQuote()'s claim step: only fires when the
    // fetched row (already scoped by the same .or() filter) had no artist_id.
    const before = await detailForArtist(consultUnassigned, studioA.studioId, studioA.artistId);
    expect(before).not.toBeNull();

    const { data: fetched } = await admin.from("consultations").select("artist_id").eq("id", consultUnassigned).single();
    expect(fetched?.artist_id).toBeNull();

    await admin.from("consultations").update({ artist_id: studioA.artistId }).eq("id", consultUnassigned);

    const { data: after } = await admin.from("consultations").select("artist_id").eq("id", consultUnassigned).single();
    expect(after?.artist_id).toBe(studioA.artistId);

    // Revert so afterAll's cleanup + any re-run of this suite starts clean.
    await admin.from("consultations").update({ artist_id: null }).eq("id", consultUnassigned);
  });
});
