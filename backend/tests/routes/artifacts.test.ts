import { describe, expect, it } from "vitest";

import { assertNotFound, assertRejectCases, createTestApp, get, put, seedProjectAndRun } from "@overfit/backend/tests/routes/helpers";

describe("artifacts routes", () => {
  it("upserts and fetches an artifact", async () => {
    const app = createTestApp();
    await seedProjectAndRun(app);
    const artifactPayload = {
      runId: "run-1",
      name: "model",
      type: "model",
      version: "v1",
      uri: "s3://bucket/model"
    };
    await put(app, "artifacts", "artifact-1", artifactPayload);
    const response = await get(app, "artifacts", "artifact-1");
    expect(response.body).toMatchObject({ id: "artifact-1", ...artifactPayload });
  });

  it("rejects unknown artifacts", async () => {
    const app = createTestApp();
    await assertNotFound(app, "artifacts", "missing", "Artifact not found");
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();
    const cases = [
      { payload: { name: "model", type: "model", version: "v2" }, error: "Artifact runId is required" },
      { payload: { runId: "run-1", type: "model", version: "v2" }, error: "Artifact name is required" },
      { payload: { runId: "run-1", name: "model", version: "v2" }, error: "Artifact type is required" },
      { payload: { runId: "run-1", name: "model", type: "model" }, error: "Artifact version is required" }
    ];
    await assertRejectCases(app, "artifacts", cases);
  });

  it("rejects invalid run references", async () => {
    const app = createTestApp();
    const response = await put(app, "artifacts", "artifact-3", { runId: "missing-run", name: "model", type: "model", version: "v1" }, 400);
    expect(response.body).toMatchObject({ error: "Artifact runId does not reference an existing run" });
  });
});
