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
});
