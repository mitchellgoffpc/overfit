import { describe, expect, it } from "vitest";

import { assertNotFound, assertRejectCases, createTestApp, get, put } from "@overfit/backend/tests/routes/helpers";

describe("artifacts routes", () => {
  it("upserts and fetches an artifact", async () => {
    const app = await createTestApp();
    await put(app, "projects", "project-1", { name: "Overfit" });
    await put(app, "runs", "run-1", { projectId: "project-1", name: "Run 1", status: "running" });
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
    const app = await createTestApp();
    await assertNotFound(app, "artifacts", "missing", "Artifact not found");
  });

  it("rejects missing required fields", async () => {
    const app = await createTestApp();
    const cases = [
      { payload: { name: "model", type: "model" }, error: "Artifact fields are required: runId, version" },
      { payload: { runId: "run-1", type: "model" }, error: "Artifact fields are required: name, version" },
      { payload: { runId: "run-1", name: "model" }, error: "Artifact fields are required: type, version" },
      { payload: { runId: "run-1", name: "model", type: "model" }, error: "Artifact fields are required: version" }
    ];
    await assertRejectCases(app, "artifacts", cases);
  });

  it("rejects invalid run references", async () => {
    const app = await createTestApp();
    const response = await put(app, "artifacts", "artifact-3", { runId: "missing-run", name: "model", type: "model", version: "v1" }, 400);
    expect(response.body).toMatchObject({ error: "Artifact runId does not reference an existing run" });
  });
});
