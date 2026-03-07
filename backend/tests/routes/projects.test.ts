import { API_BASE } from "@overfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";

describe("projects routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
  });

  it("upserts and fetches a project", async () => {
    await request(app).put(`${API_BASE}/projects/project-1`).send({ name: "Overfit", description: "Tracking runs" }).expect(200);
    const response = await request(app).get(`${API_BASE}/projects/project-1`).expect(200);
    expect(response.body).toMatchObject({ id: "project-1", name: "Overfit", description: "Tracking runs" });
  });

  it("rejects unknown projects", async () => {
    const response = await request(app).get(`${API_BASE}/projects/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("rejects missing required fields", async () => {
    const response = await request(app).put(`${API_BASE}/projects/project-2`).send({ description: "Missing name" }).expect(400);
    expect(response.body).toMatchObject({ error: "Project fields are required: name" });
  });
});
