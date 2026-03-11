import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import { upsertUser } from "repositories/users";
import { createStorage } from "storage";

describe("artifacts routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let storageBaseDir: string;

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-artifacts-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db, createStorage({ type: "file", file: { baseDir: storageBaseDir } }));
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "underfit", description: null });
    await insertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "Run 1", status: "running", metadata: null });
  });

  it("upserts and fetches an artifact", async () => {
    const artifactPayload = { runId: "run-1", name: "model", type: "model", version: "v1", uri: "s3://bucket/model" };
    await request(app).put(`${API_BASE}/artifacts/artifact-1`).send(artifactPayload).expect(200);
    const response = await request(app).get(`${API_BASE}/artifacts/artifact-1`).expect(200);
    expect(response.body).toMatchObject({ id: "artifact-1", ...artifactPayload });
  });

  it("rejects unknown artifacts", async () => {
    const response = await request(app).get(`${API_BASE}/artifacts/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Artifact not found" });
  });

  it("rejects missing required fields", async () => {
    const cases = [
      { payload: { name: "model", type: "model" }, error: "Artifact fields are required: runId, version" },
      { payload: { runId: "run-1", type: "model" }, error: "Artifact fields are required: name, version" },
      { payload: { runId: "run-1", name: "model" }, error: "Artifact fields are required: type, version" },
      { payload: { runId: "run-1", name: "model", type: "model" }, error: "Artifact fields are required: version" }
    ];
    for (const { payload, error } of cases) {
      const response = await request(app).put(`${API_BASE}/artifacts/reject`).send(payload).expect(400);
      expect(response.body).toMatchObject({ error });
    }
  });

  it("rejects invalid run references", async () => {
    const payload = { runId: "missing-run", name: "model", type: "model", version: "v1" };
    const response = await request(app).put(`${API_BASE}/artifacts/artifact-3`).send(payload).expect(400);
    expect(response.body).toMatchObject({ error: "Artifact runId does not reference an existing run" });
  });

  it("uploads and downloads an artifact file", async () => {
    const artifactPayload = { runId: "run-1", name: "checkpoint", type: "model", version: "v1" };
    await request(app).put(`${API_BASE}/artifacts/artifact-file`).send(artifactPayload).expect(200);

    const content = Buffer.from("dummy file");
    const uploadResponse = await request(app)
      .put(`${API_BASE}/artifacts/artifact-file/file`)
      .set("Content-Type", "application/octet-stream")
      .send(content)
      .expect(200);
    expect(uploadResponse.text).toContain("\"id\":\"artifact-file\"");
    expect(uploadResponse.text).toContain("\"uri\":\"file://");

    const downloadResponse = await request(app).get(`${API_BASE}/artifacts/artifact-file/file`).expect(200);
    expect(downloadResponse.headers["content-type"]).toBe("application/octet-stream");
    expect(downloadResponse.body).toEqual(content);
  });
});
