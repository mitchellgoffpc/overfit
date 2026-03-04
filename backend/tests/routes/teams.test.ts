import { describe, expect, it } from "vitest";

import { assertNotFound, assertRejectCases, createTestApp, get, put } from "@overfit/backend/tests/routes/helpers";

describe("teams routes", () => {
  it("upserts and fetches a team", async () => {
    const app = createTestApp();
    const teamPayload = { name: "Core", slug: "core" };
    await put(app, "teams", "team-1", teamPayload);
    const response = await get(app, "teams", "team-1");
    expect(response.body).toMatchObject({ id: "team-1", ...teamPayload });
  });

  it("rejects unknown teams", async () => {
    const app = createTestApp();
    await assertNotFound(app, "teams", "missing", "Team not found");
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();
    const cases = [
      { payload: { name: "Core" }, error: "Team slug is required" },
      { payload: { slug: "core" }, error: "Team name is required" }
    ];
    await assertRejectCases(app, "teams", cases);
  });
});
