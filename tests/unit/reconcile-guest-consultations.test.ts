import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileGuestConsultations } from "@/lib/client-portal/reconcile-guest-consultations";

let sb: SupabaseMock;

beforeEach(() => {
  sb = createSupabaseMock();
  vi.mocked(createAdminClient).mockReturnValue(sb.client as unknown as ReturnType<typeof createAdminClient>);
});

// 2026-08-30 reconciliation regression coverage for the ILIKE-wildcard
// cross-client leak found and fixed during coordinator review (see
// FUNCTIONAL_BUG_LOG.md "CORRECTION to BUG-FLAGSHIP-002's fix"). The
// account's own email is used as the match key — if it contains "_" (a
// SQL ILIKE wildcard, common in real email local-parts), a naive .ilike()
// comparison would wildcard-match a DIFFERENT guest's similarly-spelled
// consultation. This must never happen — only an exact (case-insensitive)
// match may claim a consultation.
describe("reconcileGuestConsultations — exact match only, no ILIKE wildcard leak", () => {
  it("does NOT claim a different guest's similarly-spelled consultation when the account email contains an underscore", async () => {
    sb.queueFrom("consultations", [
      { id: "victim-consult", client_email: "jo.smith@example-qa.test" }, // off-by-one vs the account email below
      { id: "real-consult", client_email: "jo_smith@example-qa.test" },  // exact match
    ]);
    sb.queueFrom("ai_chats", null); // existingLink check for the one real match: none found

    await reconcileGuestConsultations("studio-1", "account-1", "jo_smith@example-qa.test");

    const chain = sb.getChain("ai_chats");
    expect(chain.insert).toHaveBeenCalledTimes(1);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ consultation_id: "real-consult", client_account_id: "account-1", studio_id: "studio-1" })
    );
    expect(chain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ consultation_id: "victim-consult" })
    );
  });

  it("matches case-insensitively on an exact (non-wildcard) basis", async () => {
    sb.queueFrom("consultations", [{ id: "c-1", client_email: "Jo.Smith@Example.Test" }]);
    sb.queueFrom("ai_chats", null);

    await reconcileGuestConsultations("studio-1", "account-1", "jo.smith@example.test");

    const chain = sb.getChain("ai_chats");
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ consultation_id: "c-1" }));
  });

  it("never re-claims a consultation that already has an ai_chats link", async () => {
    sb.queueFrom("consultations", [{ id: "c-1", client_email: "client@example.test" }]);
    sb.queueFrom("ai_chats", { id: "existing-link" }); // existingLink check: already linked

    await reconcileGuestConsultations("studio-1", "account-1", "client@example.test");

    const chain = sb.getChain("ai_chats");
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("is a no-op when no guest consultation matches this studio+email", async () => {
    sb.queueFrom("consultations", [{ id: "c-1", client_email: "someone-else@example.test" }]);

    await reconcileGuestConsultations("studio-1", "account-1", "client@example.test");

    expect(sb.fromCalls).not.toContain("ai_chats");
  });
});
