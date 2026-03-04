import { describe, expect, it } from "vitest";

import { assertNotFound, assertRejectCases, createTestApp, get, put } from "@overfit/backend/tests/routes/helpers";

describe("users routes", () => {
  it("upserts and fetches a user", async () => {
    const app = createTestApp();
    const userPayload = { email: "ada@example.com", displayName: "Ada Lovelace" };
    const upsertResponse = await put(app, "users", "user-1", userPayload);
    expect(upsertResponse.body).toMatchObject({ id: "user-1", ...userPayload });
    const getResponse = await get(app, "users", "user-1");
    expect(getResponse.body).toMatchObject({ id: "user-1", ...userPayload });
  });

  it("rejects unknown users", async () => {
    const app = createTestApp();
    await assertNotFound(app, "users", "missing", "User not found");
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();
    const cases = [
      { payload: { displayName: "Ada Lovelace" }, error: "User email is required" },
      { payload: { email: "ada@example.com" }, error: "User displayName is required" }
    ];
    await assertRejectCases(app, "users", cases);
  });
});
