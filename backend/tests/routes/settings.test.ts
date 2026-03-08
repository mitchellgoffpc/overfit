import { API_BASE } from "@underfit/types";
import type { ApiKey } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";

interface RegisterResponse {
  user: { id: string };
  session: { token: string };
}

const registerUser = async (app: ReturnType<typeof createApp>, email: string, handle: string) => {
  const response = await request(app)
    .post(`${API_BASE}/auth/register`)
    .send({ email, handle, password: "password123" })
    .expect(200);
  return response.body as RegisterResponse;
};

describe("settings routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
  });

  it("updates the current user profile", async () => {
    const { session } = await registerUser(app, "sam@example.com", "sam");
    const response = await request(app)
      .patch(`${API_BASE}/users/me`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ name: "Sam Tester", bio: "Building models." })
      .expect(200);
    expect(response.body).toMatchObject({ name: "Sam Tester", bio: "Building models.", displayName: "Sam Tester" });
  });

  it("creates and deletes API keys", async () => {
    const { user, session } = await registerUser(app, "alex@example.com", "alex");
    const created = await request(app)
      .post(`${API_BASE}/users/me/api-keys`)
      .set("Authorization", `Bearer ${session.token}`)
      .send({ label: "CI" })
      .expect(200);
    const createdBody = created.body as ApiKey;
    expect(createdBody).toMatchObject({ userId: user.id, label: "CI" });
    expect(typeof createdBody.token).toBe("string");

    const list = await request(app)
      .get(`${API_BASE}/users/me/api-keys`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200);
    const listBody = list.body as ApiKey[];
    expect(listBody.length).toBe(1);

    await request(app)
      .delete(`${API_BASE}/users/me/api-keys/${createdBody.id}`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200);

    const listAfterDelete = await request(app)
      .get(`${API_BASE}/users/me/api-keys`)
      .set("Authorization", `Bearer ${session.token}`)
      .expect(200);
    const listAfterDeleteBody = listAfterDelete.body as ApiKey[];
    expect(listAfterDeleteBody.length).toBe(0);
  });
});
