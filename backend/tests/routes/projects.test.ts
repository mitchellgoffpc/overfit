import { API_VERSION } from "@overfit/types";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ server: { port: 4000 }, storage: { type: "sqlite", sqlite: { path: ":memory:" } } });

describe("projects routes", () => {
  it("upserts and fetches a project", async () => {
    const app = createTestApp();

    const projectPayload = {
      name: "Overfit",
      description: "Tracking runs"
    };

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send(projectPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/projects/project-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "project-1",
      ...projectPayload
    });
  });
});
