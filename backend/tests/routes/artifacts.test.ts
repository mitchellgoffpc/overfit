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
import { createApiKey } from "repositories/api-keys";
import { createProject } from "repositories/projects";
import { createRun } from "repositories/runs";
import { createUser } from "repositories/users";

describe("artifacts routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let storageBaseDir: string;
  let userId: string;
  let projectId: string;
  let runId: string;
  let auth: [string, string];

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-artifacts-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({ storage: { type: "file", baseDir: storageBaseDir } }), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null }))!.id;
    projectId = (await createProject(db, { accountId: userId, name: "underfit", description: null }))!.id;
    runId = (await createRun(db, { projectId, userId, name: "Run 1", status: "running", config: null }))!.id;
    const { token } = await createApiKey(db, { userId, label: "test", token: "test-token" });
    auth = ["Authorization", `Bearer ${token}`];
  });

  it("creates and fetches a project-scoped artifact", async () => {
    const payload = {
      runId,
      step: 10,
      name: "model-checkpoint",
      type: "model",
      manifest: { files: [{ path: "weights.bin" }, { path: "config.json" }], references: ["https://example.com/reference"] }
    };
    const base = `${API_BASE}/accounts/ada/projects/underfit/artifacts`;
    const createResponse = await request(app).post(base).set(...auth).send(payload).expect(200);
    expect(createResponse.body).toMatchObject({
      projectId,
      runId,
      step: 10,
      name: "model-checkpoint",
      type: "model",
      status: "open",
      declaredFileCount: 2,
      uploadedFileCount: 0,
      finalizedAt: null
    });
    expect((createResponse.body as { id: string; storageKey: string }).storageKey)
      .toEqual(`${runId}/artifacts/${(createResponse.body as { id: string }).id}`);

    const artifactId = (createResponse.body as { id: string }).id;
    const getResponse = await request(app).get(`${API_BASE}/artifacts/${artifactId}`).expect(200);
    expect(getResponse.body).toMatchObject({ id: artifactId, projectId, runId, step: 10 });
  });

  it("rejects run IDs from other projects", async () => {
    const otherProjectId = (await createProject(db, { accountId: userId, name: "other", description: null }))!.id;
    const otherRunId = (await createRun(db, { projectId: otherProjectId, userId, name: "Run 2", status: "running", config: null }))!.id;
    const payload = { runId: otherRunId, name: "model", type: "model", manifest: { files: [{ path: "weights.bin" }] } };
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/artifacts`).set(...auth).send(payload).expect(400);
    expect(response.body).toMatchObject({ error: "Artifact could not be created" });
  });

  it("uploads declared files, downloads them, and blocks writes after finalize", async () => {
    const createResponse = await request(app)
      .post(`${API_BASE}/accounts/ada/projects/underfit/artifacts`)
      .set(...auth)
      .send({ name: "dataset", type: "dataset", manifest: { files: [{ path: "a.bin" }, { path: "dir/b.bin" }] } })
      .expect(200);
    const artifactId = (createResponse.body as { id: string }).id;
    const fileBase = `${API_BASE}/artifacts/${artifactId}/files`;

    const uploadA = await request(app)
      .put(`${fileBase}/a.bin`)
      .set(...auth)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("A"))
      .expect(200);
    expect(uploadA.body).toMatchObject({ uploadedFileCount: 1, status: "open" });
    const uploadB = await request(app)
      .put(`${fileBase}/dir/b.bin`)
      .set(...auth)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("B"))
      .expect(200);
    expect(uploadB.body).toMatchObject({ uploadedFileCount: 2, status: "open" });

    const download = await request(app).get(`${fileBase}/dir/b.bin`).expect(200);
    expect(download.headers["content-type"]).toBe("application/octet-stream");
    expect(download.body).toEqual(Buffer.from("B"));

    const finalized = await request(app).post(`${API_BASE}/artifacts/${artifactId}/finalize`).set(...auth).send({}).expect(200);
    expect(finalized.body).toMatchObject({ success: true });

    const blocked = await request(app)
      .put(`${fileBase}/a.bin`)
      .set(...auth)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("A2"))
      .expect(409);
    expect(blocked.body).toMatchObject({ error: "Artifact is finalized and no longer accepts writes" });
  });

  it("rejects uploads for paths not declared in the manifest", async () => {
    const createResponse = await request(app)
      .post(`${API_BASE}/accounts/ada/projects/underfit/artifacts`)
      .set(...auth)
      .send({ name: "artifact", type: "dataset", manifest: { files: [{ path: "allowed.bin" }] } })
      .expect(200);
    const artifactId = (createResponse.body as { id: string }).id;
    const response = await request(app)
      .put(`${API_BASE}/artifacts/${artifactId}/files/forbidden.bin`)
      .set(...auth)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("data"))
      .expect(400);
    expect(response.body).toMatchObject({ error: "File path forbidden.bin is not declared in manifest" });
  });

  it("rejects finalize when manifest files are missing", async () => {
    const createResponse = await request(app)
      .post(`${API_BASE}/accounts/ada/projects/underfit/artifacts`)
      .set(...auth)
      .send({ name: "artifact", type: "dataset", manifest: { files: [{ path: "present.bin" }, { path: "missing.bin" }] } })
      .expect(200);
    const artifactId = (createResponse.body as { id: string }).id;
    await request(app)
      .put(`${API_BASE}/artifacts/${artifactId}/files/present.bin`)
      .set(...auth)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("data"))
      .expect(200);

    const finalize = await request(app).post(`${API_BASE}/artifacts/${artifactId}/finalize`).set(...auth).send({}).expect(409);
    expect(finalize.body).toMatchObject({
      error: "Artifact cannot be finalized because some files are missing"
    });
  });

  it("requires runId when step is provided", async () => {
    const response = await request(app)
      .post(`${API_BASE}/accounts/ada/projects/underfit/artifacts`)
      .set(...auth)
      .send({ step: 3, name: "artifact", type: "dataset", manifest: { files: [{ path: "a.bin" }] } })
      .expect(400);
    expect(response.body).toMatchObject({ error: "step: step requires runId" });
  });

  it("deduplicates duplicate files and references when creating artifacts", async () => {
    const createResponse = await request(app)
      .post(`${API_BASE}/accounts/ada/projects/underfit/artifacts`)
      .set(...auth)
      .send({
        name: "dedupe-test",
        type: "dataset",
        manifest: {
          files: [{ path: "a.bin" }, { path: "a.bin" }, { path: "b.bin" }],
          references: ["https://example.com/r1", "https://example.com/r1", "https://example.com/r2"]
        }
      })
      .expect(200);
    expect(createResponse.body).toMatchObject({ declaredFileCount: 2 });
    const created = createResponse.body as { id: string; storageKey: string };
    expect(created.storageKey).toEqual(`${projectId}/artifacts/${created.id}`);
  });
});
