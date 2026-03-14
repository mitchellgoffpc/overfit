import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createOrganization } from "repositories/organizations";
import { createUser } from "repositories/users";

describe("accounts routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
  });

  it("checks whether a handle exists", async () => {
    await createUser(db, { email: "ada@example.com", handle: "ada lovelace", name: "Ada Lovelace", bio: null });

    const missing = await request(app).get(`${API_BASE}/accounts/%20/exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "Handle is required" });

    const exists = await request(app).get(`${API_BASE}/accounts/Ada%20Lovelace/exists`).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${API_BASE}/accounts/Grace%20Hopper/exists`).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });

  it("fetches an account by handle", async () => {
    const user = await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null });
    const organization = await createOrganization(db, { handle: "core", name: "Core" });

    const userResponse = await request(app).get(`${API_BASE}/accounts/ada`).expect(200);
    expect(userResponse.body).toMatchObject({ id: user.id, email: "ada@example.com", handle: "ada", name: "Ada Lovelace", type: "USER" });

    const orgResponse = await request(app).get(`${API_BASE}/accounts/core`).expect(200);
    expect(orgResponse.body).toMatchObject({ id: organization.id, handle: "core", name: "Core", type: "ORGANIZATION" });

    const missing = await request(app).get(`${API_BASE}/accounts/unknown`).expect(404);
    expect(missing.body).toMatchObject({ error: "Account not found" });
  });
});
