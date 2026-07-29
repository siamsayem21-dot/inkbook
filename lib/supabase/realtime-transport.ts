import WS from "ws";
import type { RealtimeClientOptions } from "@supabase/supabase-js";

/**
 * @supabase/supabase-js constructs a RealtimeClient (and resolves a
 * WebSocket implementation) synchronously inside `createClient()`, not
 * lazily on first channel use. On Node.js < 22 there's no native
 * `WebSocket` global, so every server-side `createClient()` call throws
 * immediately unless a transport is supplied explicitly — this happened in
 * CI (pinned to Node 20) and broke every DB-verification and E2E test that
 * touches Supabase. Browser clients (lib/supabase/client.ts) and the Edge
 * middleware client don't need this — both runtimes provide a native
 * WebSocket global.
 *
 * The cast works around `ws`'s overloaded constructor types not lining up
 * with realtime-js's single-signature `WebSocketLikeConstructor` — `ws` is
 * still a runtime-compatible WebSocket implementation.
 */
export const nodeRealtimeTransport = WS as unknown as NonNullable<RealtimeClientOptions["transport"]>;
