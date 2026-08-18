import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { GET, POST } from "@/app/api/stripe/connect/onboard/route";

let sb: SupabaseMock;

function mockSession(user: { id: string } | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user }, error: user ? null : new Error("no session") })) },
  } as unknown as ReturnType<typeof createServerClient>);
}

const accountsCreate = vi.fn(() => Promise.resolve({ id: "acct_new" }));
const accountLinksCreate = vi.fn(() => Promise.resolve({ url: "https://connect.stripe.com/setup/acct_new" }));

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
  accountsCreate.mockClear();
  accountLinksCreate.mockClear();
  vi.mocked(getStripe).mockReturnValue({
    accounts: { create: accountsCreate },
    accountLinks: { create: accountLinksCreate },
  } as unknown as ReturnType<typeof getStripe>);
});

describe("POST /api/stripe/connect/onboard", () => {
  const originalFlag = process.env.STRIPE_CONNECT_ENABLED;
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.STRIPE_CONNECT_ENABLED;
    else process.env.STRIPE_CONNECT_ENABLED = originalFlag;
  });

  it("503s when Stripe Connect is not enabled — creates zero Stripe accounts", async () => {
    delete process.env.STRIPE_CONNECT_ENABLED;
    const res = await POST();
    expect(res.status).toBe(503);
    expect(accountsCreate).not.toHaveBeenCalled();
  });

  it("401s when there is no authenticated session", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    mockSession(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(accountsCreate).not.toHaveBeenCalled();
  });

  it("404s when the authenticated user has no studio", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    mockSession({ id: "user-1" });
    sb.queueFrom("studios", null);
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("creates a new Standard account for a studio with none yet, then returns an onboarding link", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    mockSession({ id: "user-1" });
    sb.queueFrom("studios", { id: "studio-1", stripe_connected_account_id: null });

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://connect.stripe.com/setup/acct_new");
    expect(accountsCreate).toHaveBeenCalledWith({ type: "standard" });
    expect(accountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({ account: "acct_new", type: "account_onboarding" })
    );
  });

  it("resumes an existing account instead of creating a duplicate", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    mockSession({ id: "user-1" });
    sb.queueFrom("studios", { id: "studio-1", stripe_connected_account_id: "acct_existing" });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(accountsCreate).not.toHaveBeenCalled();
    expect(accountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({ account: "acct_existing" })
    );
  });
});

describe("GET /api/stripe/connect/onboard (Account Link refresh_url)", () => {
  const originalFlag = process.env.STRIPE_CONNECT_ENABLED;
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.STRIPE_CONNECT_ENABLED;
    else process.env.STRIPE_CONNECT_ENABLED = originalFlag;
  });

  it("redirects to a fresh onboarding link on success", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    mockSession({ id: "user-1" });
    sb.queueFrom("studios", { id: "studio-1", stripe_connected_account_id: "acct_existing" });

    const res = await GET();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://connect.stripe.com/setup/acct_new");
  });

  it("redirects to an error page (not a bare JSON error) when unauthenticated", async () => {
    process.env.STRIPE_CONNECT_ENABLED = "true";
    mockSession(null);
    const res = await GET();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/owner/settings/billing");
  });
});
