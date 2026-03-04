import { describe, expect, it } from "vitest";

import { assertNotFound, assertRejectCases, createTestApp, get, put, seedProject } from "@overfit/backend/tests/routes/helpers";

describe("runs routes", () => {
  it("upserts and fetches a run", async () => {
    const app = createTestApp();
    await seedProject(app);
    const runPayload = {
      projectId: "project-1",
      name: "Run 1",
      status: "running",
      metadata: { lr: 0.001 }
    };
    await put(app, "runs", "run-1", runPayload);
    const response = await get(app, "runs", "run-1");
    expect(response.body).toMatchObject({ id: "run-1", ...runPayload });
  });

  it("rejects unknown runs", async () => {
    const app = createTestApp();
    await assertNotFound(app, "runs", "missing", "Run not found");
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();
    const cases = [
      { payload: { name: "Run 2", status: "running" }, error: "Run projectId is required" },
      { payload: { projectId: "project-1", status: "running" }, error: "Run name is required" },
      { payload: { projectId: "project-1", name: "Run 2" }, error: "Run status is required" }
    ];
    await assertRejectCases(app, "runs", cases);
  });
});
