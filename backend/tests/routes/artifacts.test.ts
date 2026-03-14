import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import { createUser } from "repositories/users";

describe("artifacts routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let storageBaseDir: string;
  let userId: string;
  let runId: string;
  let projectId: string;

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-artifacts-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({ storage: { type: "file", baseDir: storageBaseDir } }), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null })).id;
    projectId = (await createProject(db, { accountId: userId, name: "underfit", description: null })).id;
    runId = (await insertRun(db, { projectId, userId, name: "Run 1", status: "running", metadata: null })).id;
  });

  it("inserts and fetches an artifact", async () => {
    const artifactPayload = { runId, name: "model", type: "model", version: "v1", uri: "s3://bucket/model" };
    const insertResponse = await request(app).put(`${API_BASE}/artifacts`).send(artifactPayload).expect(200);
    const artifactId = (insertResponse.body as { id: string }).id;
    expect(artifactId).toEqual(expect.any(String));
    const response = await request(app).get(`${API_BASE}/artifacts/${artifactId}`).expect(200);
    expect(response.body).toMatchObject(artifactPayload);
  });

  it("rejects unknown artifacts", async () => {
    const response = await request(app).get(`${API_BASE}/artifacts/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Artifact not found" });
  });

  it("rejects missing required fields", async () => {
    const cases = [
      { payload: { name: "model", type: "model" }, error: "runId: Invalid input: expected string, received undefined" },
      { payload: { runId, type: "model" }, error: "name: Invalid input: expected string, received undefined" },
      { payload: { runId, name: "model" }, error: "type: Invalid input: expected string, received undefined" },
      { payload: { runId, name: "model", type: "model" }, error: "version: Invalid input: expected string, received undefined" }
    ];
    for (const { payload, error } of cases) {
      const response = await request(app).put(`${API_BASE}/artifacts`).send(payload).expect(400);
      expect(response.body).toMatchObject({ error });
    }
  });

  it("rejects invalid run references", async () => {
    const payload = { runId: "missing-run", name: "model", type: "model", version: "v1" };
    const response = await request(app).put(`${API_BASE}/artifacts`).send(payload).expect(400);
    expect(response.body).toMatchObject({ error: "Artifact runId does not reference an existing run" });
  });

  it("uploads and downloads an artifact file", async () => {
    const artifactPayload = { runId, name: "checkpoint", type: "model", version: "v1" };
    const insertResponse = await request(app).put(`${API_BASE}/artifacts`).send(artifactPayload).expect(200);
    const artifactId = (insertResponse.body as { id: string }).id;

    const content = Buffer.from("dummy file");
    const uploadResponse = await request(app)
      .put(`${API_BASE}/artifacts/${artifactId}/file`)
      .set("Content-Type", "application/octet-stream")
      .send(content)
      .expect(200);
    expect(uploadResponse.text).toContain(`"id":"${artifactId}"`);
    expect(uploadResponse.text).toContain('"uri":"file://');

    const downloadResponse = await request(app).get(`${API_BASE}/artifacts/${artifactId}/file`).expect(200);
    expect(downloadResponse.headers["content-type"]).toBe("application/octet-stream");
    expect(downloadResponse.body).toEqual(content);
  });
});
