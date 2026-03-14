import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";

describe("app routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
  });

  it("returns json 404 for unknown routes", async () => {
    const response = await request(app).get(`${API_BASE}/missing`).expect(404);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({ error: "Route not found" });
  });
});
