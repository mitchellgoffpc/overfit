import { API_VERSION } from "@overfit/types";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ server: { port: 4000 }, storage: { type: "sqlite", sqlite: { path: ":memory:" } } });

describe("artifacts routes", () => {
  it("upserts and fetches an artifact", async () => {
    const app = createTestApp();

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send({ name: "Overfit" })
      .expect(200);

    await request(app)
      .put(`${apiBase}/runs/run-1`)
      .send({ projectId: "project-1", name: "Run 1", status: "running" })
      .expect(200);

    const artifactPayload = {
      runId: "run-1",
      name: "model",
      type: "model",
      version: "v1",
      uri: "s3://bucket/model"
    };

    await request(app)
      .put(`${apiBase}/artifacts/artifact-1`)
      .send(artifactPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/artifacts/artifact-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "artifact-1",
      ...artifactPayload
    });
  });

  it("rejects unknown artifacts", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get(`${apiBase}/artifacts/missing`)
      .expect(404);

    expect(response.body).toMatchObject({ error: "Artifact not found" });
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();

    const cases = [
      { payload: { name: "model", type: "model", version: "v2" }, error: "Artifact runId is required" },
      { payload: { runId: "run-1", type: "model", version: "v2" }, error: "Artifact name is required" },
      { payload: { runId: "run-1", name: "model", version: "v2" }, error: "Artifact type is required" },
      { payload: { runId: "run-1", name: "model", type: "model" }, error: "Artifact version is required" }
    ];

    for (const [index, testCase] of cases.entries()) {
      const response = await request(app)
        .put(`${apiBase}/artifacts/reject-${index}`)
        .send(testCase.payload)
        .expect(400);

      expect(response.body).toMatchObject({ error: testCase.error });
    }
  });

  it("rejects invalid run references", async () => {
    const app = createTestApp();

    const response = await request(app)
      .put(`${apiBase}/artifacts/artifact-3`)
      .send({ runId: "missing-run", name: "model", type: "model", version: "v1" })
      .expect(400);

    expect(response.body).toMatchObject({ error: "Artifact runId does not reference an existing run" });
  });
});
