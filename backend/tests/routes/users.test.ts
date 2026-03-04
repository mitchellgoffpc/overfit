import { API_VERSION } from "@overfit/types";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ server: { port: 4000 }, storage: { type: "sqlite", sqlite: { path: ":memory:" } } });

describe("users routes", () => {
  it("upserts and fetches a user", async () => {
    const app = createTestApp();

    const userPayload = {
      email: "ada@example.com",
      displayName: "Ada Lovelace"
    };

    const upsertResponse = await request(app)
      .put(`${apiBase}/users/user-1`)
      .send(userPayload)
      .expect(200);

    expect(upsertResponse.body).toMatchObject({
      id: "user-1",
      ...userPayload
    });

    const getResponse = await request(app)
      .get(`${apiBase}/users/user-1`)
      .expect(200);

    expect(getResponse.body).toMatchObject({
      id: "user-1",
      ...userPayload
    });
  });

  it("rejects unknown users", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get(`${apiBase}/users/missing`)
      .expect(404);

    expect(response.body).toMatchObject({ error: "User not found" });
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();

    const cases = [
      { payload: { displayName: "Ada Lovelace" }, error: "User email is required" },
      { payload: { email: "ada@example.com" }, error: "User displayName is required" }
    ];

    for (const [index, testCase] of cases.entries()) {
      const response = await request(app)
        .put(`${apiBase}/users/reject-${index}`)
        .send(testCase.payload)
        .expect(400);

      expect(response.body).toMatchObject({ error: testCase.error });
    }
  });
});
