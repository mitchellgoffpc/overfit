import { API_VERSION } from "@overfit/types";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ server: { port: 4000 }, storage: { type: "sqlite", sqlite: { path: ":memory:" } } });

describe("teams routes", () => {
  it("upserts and fetches a team", async () => {
    const app = createTestApp();

    const teamPayload = {
      name: "Core",
      slug: "core"
    };

    await request(app)
      .put(`${apiBase}/teams/team-1`)
      .send(teamPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/teams/team-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "team-1",
      ...teamPayload
    });
  });
});
