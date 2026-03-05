import { describe, expect, it } from "vitest";

import { assertNotFound, assertRejectCases, createTestApp, get, put, testTimestamp } from "@overfit/backend/tests/routes/helpers";

describe("metrics routes", () => {
  it("upserts and fetches a metric", async () => {
    const app = createTestApp();
    await put(app, "projects", "project-1", { name: "Overfit" });
    await put(app, "runs", "run-1", { projectId: "project-1", name: "Run 1", status: "running" });
    const metricPayload = {
      runId: "run-1",
      name: "accuracy",
      value: 0.98,
      step: 10,
      timestamp: testTimestamp
    };
    await put(app, "metrics", "metric-1", metricPayload);
    const response = await get(app, "metrics", "metric-1");
    expect(response.body).toMatchObject({ id: "metric-1", ...metricPayload });
  });

  it("rejects unknown metrics", async () => {
    const app = createTestApp();
    await assertNotFound(app, "metrics", "missing", "Metric not found");
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();
    const cases = [
      { payload: { value: 0.12, timestamp: testTimestamp }, error: "Metric fields are required: runId, name" },
      { payload: { runId: "run-1", value: 0.12 }, error: "Metric fields are required: name, timestamp" },
      { payload: { runId: "run-1", name: "loss" }, error: "Metric fields are required: timestamp" }
    ];
    await assertRejectCases(app, "metrics", cases);
  });

  it("rejects invalid run references", async () => {
    const app = createTestApp();
    const response = await put(app, "metrics", "metric-3", { runId: "missing-run", name: "loss", value: 0.12, timestamp: testTimestamp }, 400);
    expect(response.body).toMatchObject({ error: "Metric runId does not reference an existing run" });
  });

  it("rejects non-numeric values", async () => {
    const app = createTestApp();
    await put(app, "projects", "project-1", { name: "Overfit" });
    await put(app, "runs", "run-1", { projectId: "project-1", name: "Run 1", status: "running" });
    const response = await put(app, "metrics", "metric-4", { runId: "run-1", name: "loss", value: "0.12", timestamp: testTimestamp }, 400);
    expect(response.body).toMatchObject({ error: "Metric value must be a number" });
  });
});
