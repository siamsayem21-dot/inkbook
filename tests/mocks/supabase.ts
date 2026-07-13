import { vi } from "vitest";

export type Result<T = unknown> = { data: T; error: unknown };

const ok = <T>(data: T): Result<T> => ({ data, error: null });

/**
 * A chainable stand-in for a PostgREST query builder. Every filter/modifier
 * method (eq, neq, in, not, order, limit, ...) returns the same chain so
 * arbitrary call sequences compile. The chain resolves to `result` whether
 * consumed via `await` directly, `.single()`, or `.maybeSingle()`.
 */
function makeChain(result: Result) {
  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "not", "or", "order", "limit",
    "gt", "gte", "lt", "lte", "ilike", "like", "match", "range", "is",
  ];

  const chain: Record<string, unknown> = {};
  for (const m of chainMethods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Thenable so `await supabase.from(x).select()...` resolves without a terminal call.
  chain.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);

  return chain;
}

export function createSupabaseMock() {
  const queues = new Map<string, Result[]>();
  const rpcQueue: Result[] = [];

  /** Queue the next result returned for `.from(table)`, FIFO per table. */
  function queueFrom(table: string, data: unknown, error: unknown = null) {
    const q = queues.get(table) ?? [];
    q.push({ data, error });
    queues.set(table, q);
  }

  function queueRpc(data: unknown, error: unknown = null) {
    rpcQueue.push({ data, error });
  }

  const fromCalls: string[] = [];
  const chainsByTable = new Map<string, ReturnType<typeof makeChain>[]>();
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    const q = queues.get(table);
    const result = q && q.length ? q.shift()! : ok(null);
    const chain = makeChain(result);
    const list = chainsByTable.get(table) ?? [];
    list.push(chain);
    chainsByTable.set(table, list);
    return chain;
  });

  /** Returns the Nth (1-indexed, default last) chain object returned for `.from(table)` — use to inspect e.g. `.update.mock.calls`. */
  function getChain(table: string, occurrence?: number) {
    const list = chainsByTable.get(table) ?? [];
    if (occurrence === undefined) return list[list.length - 1];
    return list[occurrence - 1];
  }

  const rpc = vi.fn(() => Promise.resolve(rpcQueue.length ? rpcQueue.shift()! : ok(null)));

  const getUserById = vi.fn(() =>
    Promise.resolve<{ data: { user: { email: string } | null }; error: unknown }>({ data: { user: null }, error: null })
  );
  const getUser = vi.fn(() =>
    Promise.resolve<{ data: { user: { email: string } | null }; error: unknown }>({ data: { user: null }, error: null })
  );

  const storageUpload = vi.fn(() =>
    Promise.resolve<{ data: { path: string } | null; error: unknown }>({ data: { path: "mock" }, error: null })
  );
  const storageCreateBucket = vi.fn(() => Promise.resolve({ data: null, error: null }));

  const client = {
    from,
    rpc,
    auth: { admin: { getUserById }, getUser },
    storage: {
      createBucket: storageCreateBucket,
      from: vi.fn(() => ({ upload: storageUpload })),
    },
  };

  return {
    client,
    queueFrom,
    queueRpc,
    fromCalls,
    getChain,
    rpc,
    getUserById,
    getUser,
    storageUpload,
    storageCreateBucket,
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;
