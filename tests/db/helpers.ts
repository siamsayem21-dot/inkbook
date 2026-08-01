import { Pool } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

/**
 * Required env vars (set by CI after `supabase start`, or by hand for local
 * runs against a Docker-based local Supabase instance):
 *   SUPABASE_DB_URL                 postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   NEXT_PUBLIC_SUPABASE_URL         http://127.0.0.1:54321
 *   SUPABASE_SERVICE_ROLE_KEY        (printed by `supabase status`)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY    (printed by `supabase status`)
 */
const REQUIRED = [
  "SUPABASE_DB_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function assertDbEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `tests/db requires a running local Supabase instance. Missing env: ${missing.join(", ")}.\n` +
        `Run: supabase start   then export the printed values (see README "Testing" section), ` +
        `or let CI (.github/workflows/test.yml) do it automatically.`
    );
  }
}

let pool: Pool | null = null;
export function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });
  return pool;
}

export function getAdminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ws's constructor is structurally compatible with supabase-js's WebSocketLikeConstructor but not typed as such
    realtime: { transport: ws as any },
  });
}

/** Anon-key client, optionally authenticated as a specific user via access token. */
export function getAnonClient(accessToken?: string): SupabaseClient {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ws's constructor is structurally compatible with supabase-js's WebSocketLikeConstructor but not typed as such
    realtime: { transport: ws as any },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
  return client;
}

/** Creates a confirmed auth user via the admin API and returns their access token. */
export async function createAuthUser(email: string, password: string): Promise<{ userId: string; accessToken: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createAuthUser failed: ${error?.message}`);

  const anon = getAnonClient();
  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.session) throw new Error(`signIn failed: ${signInError?.message}`);

  return { userId: data.user.id, accessToken: signInData.session.access_token };
}

export async function deleteAuthUser(userId: string): Promise<void> {
  await getAdminClient().auth.admin.deleteUser(userId);
}

/** Unique, obviously-a-test-fixture identifier for this run. */
export function testTag(): string {
  return `dbtest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type StudioGraph = {
  ownerUserId: string;
  ownerAccessToken: string;
  studioId: string;
  artistUserId: string;
  artistAccessToken: string;
  artistId: string;
  clientId: string;
  bookingId: string;
};

/**
 * Provisions a full owner -> studio -> artist -> client -> booking graph via
 * the admin client (bypasses RLS). Used as fixture data for RLS/constraint/
 * cascade tests. Caller is responsible for cleanup (or relies on the CASCADE
 * behavior under test to remove it).
 */
export async function provisionStudioGraph(tag: string): Promise<StudioGraph> {
  const admin = getAdminClient();

  const { userId: ownerUserId, accessToken: ownerAccessToken } = await createAuthUser(
    `${tag}-owner@example.test`,
    "Password123!"
  );

  const { data: studio, error: studioErr } = await admin
    .from("studios")
    .insert({
      name: `${tag} Studio`,
      subdomain: tag,
      owner_id: ownerUserId,
      deposit_amount_cents: 10000,
    })
    .select("id")
    .single();
  if (studioErr || !studio) throw new Error(`provision studio failed: ${studioErr?.message}`);

  const { userId: artistUserId, accessToken: artistAccessToken } = await createAuthUser(
    `${tag}-artist@example.test`,
    "Password123!"
  );

  const { data: artist, error: artistErr } = await admin
    .from("artists")
    .insert({
      studio_id: studio.id,
      user_id: artistUserId,
      name: `${tag} Artist`,
      email: `${tag}-artist@example.test`,
    })
    .select("id")
    .single();
  if (artistErr || !artist) throw new Error(`provision artist failed: ${artistErr?.message}`);

  const { data: client, error: clientErr } = await admin
    .from("clients")
    .insert({
      studio_id: studio.id,
      full_name: `${tag} Client`,
      email: `${tag}-client@example.test`,
      phone: "5550000000",
    })
    .select("id")
    .single();
  if (clientErr || !client) throw new Error(`provision client failed: ${clientErr?.message}`);

  const { data: booking, error: bookingErr } = await admin
    .from("bookings")
    .insert({
      studio_id: studio.id,
      artist_id: artist.id,
      client_id: client.id,
      date: "2027-01-01",
      time: "10:00",
      style: "Test",
      deposit_amount_cents: 10000,
    })
    .select("id")
    .single();
  if (bookingErr || !booking) throw new Error(`provision booking failed: ${bookingErr?.message}`);

  return {
    ownerUserId,
    ownerAccessToken,
    studioId: studio.id,
    artistUserId,
    artistAccessToken,
    artistId: artist.id,
    clientId: client.id,
    bookingId: booking.id,
  };
}

/** Best-effort teardown — deleting the owner auth user cascades to everything else. */
export async function teardownStudioGraph(graph: Pick<StudioGraph, "ownerUserId" | "artistUserId">): Promise<void> {
  const admin = getAdminClient();
  await admin.auth.admin.deleteUser(graph.ownerUserId).catch(() => {});
  await admin.auth.admin.deleteUser(graph.artistUserId).catch(() => {});
}
