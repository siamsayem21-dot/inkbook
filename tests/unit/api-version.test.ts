import { describe, it, expect } from "vitest";
import pkg from "../../package.json";
import { GET } from "@/app/api/version/route";

describe("GET /api/version", () => {
  it("returns 200 with the package.json version and an ISO date", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.version).toBe(pkg.version);
    expect(new Date(body.date).toISOString()).toBe(body.date);
  });
});
