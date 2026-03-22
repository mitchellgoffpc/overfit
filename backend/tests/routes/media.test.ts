import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { API_BASE } from "@underfit/types";
import type { Media } from "@underfit/types";
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

describe("media routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let storageBaseDir: string;
  let userId: string;
  let projectId: string;
  let auth: [string, string];

  const RUN_MEDIA = `${API_BASE}/accounts/ada/projects/underfit/runs/run-1/media`;

  const postMedia = (url: string, meta: Record<string, unknown>, ...files: Buffer[]) => {
    const req = request(app).post(url).set(...auth).field("metadata", JSON.stringify(meta));
    files.forEach((file) => { req.attach("files", file, "file.bin"); });
    return req;
  };

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-media-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({ storage: { type: "file", baseDir: storageBaseDir } }), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null }))!.id;
    projectId = (await createProject(db, { accountId: userId, name: "underfit", description: null }))!.id;
    await createRun(db, { projectId, userId, name: "run-1", status: "running", config: null });
    const { token } = await createApiKey(db, { userId, label: "test", token: "test-token" });
    auth = ["Authorization", `Bearer ${token}`];
  });

  it("creates and lists a single-file media", async () => {
    const res = await postMedia(RUN_MEDIA, { key: "predictions", step: 10, type: "image" }, Buffer.from("img")).expect(200);
    const media = res.body as Media;
    expect(media.id).toEqual(expect.any(String));
    expect(media).toMatchObject({ key: "predictions", step: 10, type: "image", count: 1 });

    const listRes = await request(app).get(RUN_MEDIA).expect(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body).toMatchObject([{ id: media.id, key: "predictions", step: 10, count: 1 }]);
  });

  it("creates multi-file media and downloads by index", async () => {
    const files = [Buffer.from("file-0"), Buffer.from("file-1"), Buffer.from("file-2")];
    const res = await postMedia(RUN_MEDIA, { key: "samples", step: 5, type: "image" }, ...files).expect(200);
    const media = res.body as Media;
    expect(media.count).toBe(3);

    for (let i = 0; i < files.length; i++) {
      const dl = await request(app).get(`${RUN_MEDIA}/${media.id}/file`).query({ index: String(i) }).expect(200);
      expect(dl.body).toEqual(files[i]);
    }
  });

  it("downloads index 0 by default", async () => {
    const content = Buffer.from("default-file");
    const res = await postMedia(RUN_MEDIA, { key: "img", step: 0, type: "image" }, content).expect(200);
    const mediaId = (res.body as Media).id;

    const dl = await request(app).get(`${RUN_MEDIA}/${mediaId}/file`).expect(200);
    expect(dl.headers["content-type"]).toBe("application/octet-stream");
    expect(dl.body).toEqual(content);
  });

  it("rejects out-of-range index", async () => {
    const res = await postMedia(RUN_MEDIA, { key: "img", step: 0, type: "image" }, Buffer.from("x")).expect(200);
    const mediaId = (res.body as Media).id;

    const dl = await request(app).get(`${RUN_MEDIA}/${mediaId}/file`).query({ index: "1" }).expect(400);
    expect(dl.body).toMatchObject({ error: "Index 1 out of range (count: 1)" });
  });

  it("filters media by key and step", async () => {
    await postMedia(RUN_MEDIA, { key: "predictions", step: 1, type: "image" }, Buffer.from("a")).expect(200);
    await postMedia(RUN_MEDIA, { key: "predictions", step: 2, type: "image" }, Buffer.from("b")).expect(200);
    await postMedia(RUN_MEDIA, { key: "samples", step: 1, type: "video" }, Buffer.from("c")).expect(200);

    const byKey = await request(app).get(RUN_MEDIA).query({ key: "predictions" }).expect(200);
    expect(byKey.body).toHaveLength(2);

    const byStep = await request(app).get(RUN_MEDIA).query({ step: "1" }).expect(200);
    expect(byStep.body).toHaveLength(2);

    const byBoth = await request(app).get(RUN_MEDIA).query({ key: "predictions", step: "1" }).expect(200);
    expect(byBoth.body).toHaveLength(1);
  });

  it("returns 404 for missing run", async () => {
    const url = `${API_BASE}/accounts/ada/projects/underfit/runs/missing/media`;
    const res = await postMedia(url, { key: "img", step: 0, type: "image" }, Buffer.from("x")).expect(404);
    expect(res.body).toMatchObject({ error: "Run not found" });
  });

  it("returns 404 for unknown media id", async () => {
    const res = await request(app).get(`${RUN_MEDIA}/nonexistent/file`).expect(404);
    expect(res.body).toMatchObject({ error: "Media not found" });
  });

  it("rejects request with no files", async () => {
    const res = await postMedia(RUN_MEDIA, { key: "img", step: 0, type: "image" }).expect(400);
    expect(res.body).toMatchObject({ error: "At least one file is required" });
  });

  it("rejects missing metadata field", async () => {
    const res = await request(app).post(RUN_MEDIA).set(...auth).attach("files", Buffer.from("x"), "f.bin").expect(400);
    expect(res.body).toMatchObject({ error: "A metadata field is required" });
  });

  it("rejects missing required metadata fields", async () => {
    const noKey = await postMedia(RUN_MEDIA, { step: 0, type: "image" }, Buffer.from("x")).expect(400);
    expect((noKey.body as { error: string }).error).toContain("key");

    const noType = await postMedia(RUN_MEDIA, { key: "img", step: 0 }, Buffer.from("x")).expect(400);
    expect((noType.body as { error: string }).error).toContain("type");
  });

  it("rejects invalid media type", async () => {
    const res = await postMedia(RUN_MEDIA, { key: "img", type: "spreadsheet" }, Buffer.from("x")).expect(400);
    expect((res.body as { error: string }).error).toContain("type");
  });

  it("supports omitted step", async () => {
    const res = await postMedia(RUN_MEDIA, { key: "img", type: "image" }, Buffer.from("x")).expect(200);
    expect((res.body as Media).step).toBeNull();
  });

  it("stores and returns metadata", async () => {
    const metadata = { caption: "Training sample", format: "png", width: 256, height: 256 };
    const res = await postMedia(RUN_MEDIA, { key: "img", step: 0, type: "image", metadata }, Buffer.from("x")).expect(200);
    expect((res.body as Media).metadata).toMatchObject(metadata);

    const listRes = await request(app).get(RUN_MEDIA).expect(200);
    expect((listRes.body as Media[])[0]!.metadata).toMatchObject(metadata);
  });

  it("rejects invalid metadata JSON in metadata field", async () => {
    const res = await request(app).post(RUN_MEDIA).set(...auth)
      .field("metadata", "not json").attach("files", Buffer.from("x"), "f.bin").expect(400);
    expect(res.body).toMatchObject({ error: "metadata: Invalid JSON" });
  });
});
