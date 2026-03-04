import { API_VERSION } from "@overfit/types";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ server: { port: 4000 }, storage: { type: "sqlite", sqlite: { path: ":memory:" } } });

describe("runs routes", () => {
  it("upserts and fetches a run", async () => {
    const app = createTestApp();

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send({ name: "Overfit" })
      .expect(200);

    const runPayload = {
      projectId: "project-1",
      name: "Run 1",
      status: "running",
      metadata: { lr: 0.001 }
    };

    await request(app)
      .put(`${apiBase}/runs/run-1`)
      .send(runPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/runs/run-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "run-1",
      ...runPayload
    });
  });

  it("rejects unknown runs", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get(`${apiBase}/runs/missing`)
      .expect(404);

    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();

    const cases = [
      { payload: { name: "Run 2", status: "running" }, error: "Run projectId is required" },
      { payload: { projectId: "project-1", status: "running" }, error: "Run name is required" },
      { payload: { projectId: "project-1", name: "Run 2" }, error: "Run status is required" }
    ];

    for (const [index, testCase] of cases.entries()) {
      const response = await request(app)
        .put(`${apiBase}/runs/reject-${index}`)
        .send(testCase.payload)
        .expect(400);

      expect(response.body).toMatchObject({ error: testCase.error });
    }
  });
});
