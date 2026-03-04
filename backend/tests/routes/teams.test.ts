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

  it("rejects unknown teams", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get(`${apiBase}/teams/missing`)
      .expect(404);

    expect(response.body).toMatchObject({ error: "Team not found" });
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();

    const cases = [
      { payload: { name: "Core" }, error: "Team slug is required" },
      { payload: { slug: "core" }, error: "Team name is required" }
    ];

    for (const [index, testCase] of cases.entries()) {
      const response = await request(app)
        .put(`${apiBase}/teams/reject-${index}`)
        .send(testCase.payload)
        .expect(400);

      expect(response.body).toMatchObject({ error: testCase.error });
    }
  });
});
