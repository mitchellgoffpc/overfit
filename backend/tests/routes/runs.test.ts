import { API_VERSION } from "@app/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ storageConfig: { type: "sqlite", sqlitePath: ":memory:" } });

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
});
