import { API_VERSION } from "@overfit/types";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ server: { port: 4000 }, storage: { type: "sqlite", sqlite: { path: ":memory:" } } });

describe("metrics routes", () => {
  it("upserts and fetches a metric", async () => {
    const app = createTestApp();

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send({ name: "Overfit" })
      .expect(200);

    await request(app)
      .put(`${apiBase}/runs/run-1`)
      .send({ projectId: "project-1", name: "Run 1", status: "running" })
      .expect(200);

    const metricPayload = {
      runId: "run-1",
      name: "accuracy",
      value: 0.98,
      step: 10,
      timestamp: new Date("2025-01-01T00:00:00.000Z").toISOString()
    };

    await request(app)
      .put(`${apiBase}/metrics/metric-1`)
      .send(metricPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/metrics/metric-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "metric-1",
      ...metricPayload
    });
  });

  it("rejects unknown metrics", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get(`${apiBase}/metrics/missing`)
      .expect(404);

    expect(response.body).toMatchObject({ error: "Metric not found" });
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();

    const timestamp = new Date("2025-01-01T00:00:00.000Z").toISOString();
    const cases = [
      { payload: { name: "loss", value: 0.12, timestamp }, error: "Metric runId is required" },
      { payload: { runId: "run-1", value: 0.12, timestamp }, error: "Metric name is required" },
      { payload: { runId: "run-1", name: "loss", value: 0.12 }, error: "Metric timestamp is required" }
    ];

    for (const [index, testCase] of cases.entries()) {
      const response = await request(app)
        .put(`${apiBase}/metrics/reject-${index}`)
        .send(testCase.payload)
        .expect(400);

      expect(response.body).toMatchObject({ error: testCase.error });
    }
  });

  it("rejects invalid run references", async () => {
    const app = createTestApp();
    const timestamp = new Date("2025-01-01T00:00:00.000Z").toISOString();

    const response = await request(app)
      .put(`${apiBase}/metrics/metric-3`)
      .send({ runId: "missing-run", name: "loss", value: 0.12, timestamp })
      .expect(400);

    expect(response.body).toMatchObject({ error: "Metric runId does not reference an existing run" });
  });

  it("rejects non-numeric values", async () => {
    const app = createTestApp();
    const timestamp = new Date("2025-01-01T00:00:00.000Z").toISOString();

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send({ name: "Overfit" })
      .expect(200);

    await request(app)
      .put(`${apiBase}/runs/run-1`)
      .send({ projectId: "project-1", name: "Run 1", status: "running" })
      .expect(200);

    const response = await request(app)
      .put(`${apiBase}/metrics/metric-4`)
      .send({ runId: "run-1", name: "loss", value: "0.12", timestamp })
      .expect(400);

    expect(response.body).toMatchObject({ error: "Metric value must be a number" });
  });
});
