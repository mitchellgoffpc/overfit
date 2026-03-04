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
});
