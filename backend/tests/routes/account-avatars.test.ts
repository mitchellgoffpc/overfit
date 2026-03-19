import { API_BASE } from "@underfit/types";
import sharp from "sharp";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertAccountAvatar } from "repositories/account-avatars";
import { createOrganization } from "repositories/organizations";
import { createSession } from "repositories/sessions";
import { createUser } from "repositories/users";

const sessionCookie = (token: string) => `underfit_session=${token}`;

describe("account avatars routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null });
  });

  it("uploads, normalizes, and fetches an avatar", async () => {
    const { id: userId } = (await createUser(db, { email: "sam@example.com", handle: "sam", name: "Sam", bio: null }))!;
    const { id: sessionToken } = await createSession(db, { userId, expiresAt: "2099-01-01T00:00:00.000Z" });
    const png = await sharp({ create: { width: 512, height: 256, channels: 3, background: { r: 20, g: 120, b: 200 } } }).png().toBuffer();

    await request(app).put(`${API_BASE}/me/avatar`).set("Cookie", sessionCookie(sessionToken)).set("Content-Type", "image/png").send(png).expect(200);

    const response = await request(app).get(`${API_BASE}/accounts/sam/avatar`).expect(200);
    expect(response.headers["content-type"]).toBe("image/jpeg");
    const metadata = await sharp(Buffer.from(response.body as Uint8Array)).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(128);
  });

  it("rejects invalid avatar bytes", async () => {
    const { id: userId } = (await createUser(db, { email: "alex@example.com", handle: "alex", name: "Alex", bio: null }))!;
    const { id: sessionToken } = await createSession(db, { userId, expiresAt: "2099-01-01T00:00:00.000Z" });
    const response = await request(app)
      .put(`${API_BASE}/me/avatar`)
      .set("Cookie", sessionCookie(sessionToken))
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("not an image"))
      .expect(400);
    expect(response.body).toMatchObject({ error: "Avatar must be a supported image under the upload and output limits" });
  });

  it("deletes an avatar", async () => {
    const { id: userId } = (await createUser(db, { email: "maya@example.com", handle: "maya", name: "Maya", bio: null }))!;
    const { id: sessionToken } = await createSession(db, { userId, expiresAt: "2099-01-01T00:00:00.000Z" });
    const png = await sharp({ create: { width: 128, height: 128, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
    await request(app).put(`${API_BASE}/me/avatar`).set("Cookie", sessionCookie(sessionToken)).set("Content-Type", "image/png").send(png).expect(200);

    await request(app).delete(`${API_BASE}/me/avatar`).set("Cookie", sessionCookie(sessionToken)).expect(200);
    const response = await request(app).get(`${API_BASE}/accounts/maya/avatar`).expect(404);
    expect(response.body).toMatchObject({ error: "Avatar not found" });
  });

  it("fetches an organization avatar", async () => {
    const organization = await createOrganization(db, { handle: "acme", name: "Acme" });
    expect(organization).toBeDefined();
    const jpg = await sharp({ create: { width: 160, height: 120, channels: 3, background: { r: 0, g: 128, b: 60 } } }).jpeg().toBuffer();
    await upsertAccountAvatar(db, organization!.id, jpg);

    const response = await request(app).get(`${API_BASE}/accounts/acme/avatar`).expect(200);
    expect(response.headers["content-type"]).toBe("image/jpeg");
  });

  it("returns account not found for unknown account handles", async () => {
    const response = await request(app).get(`${API_BASE}/accounts/missing/avatar`).expect(404);
    expect(response.body).toMatchObject({ error: "Account not found" });
  });
});
