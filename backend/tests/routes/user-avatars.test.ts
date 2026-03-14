import { API_BASE } from "@underfit/types";
import sharp from "sharp";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";

interface RegisterResponse {
  session: { token: string };
}

const registerUser = async (app: ReturnType<typeof createApp>, email: string, handle: string) => {
  const response = await request(app).post(`${API_BASE}/auth/register`).send({ email, handle, password: "password123" }).expect(200);
  return response.body as RegisterResponse;
};
const sessionCookie = (token: string) => `underfit_session=${token}`;

describe("user avatars routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    await registerUser(app, "ada@example.com", "ada");
  });

  it("uploads, normalizes, and fetches an avatar", async () => {
    const { session } = await registerUser(app, "sam@example.com", "sam");
    const png = await sharp({ create: { width: 512, height: 256, channels: 3, background: { r: 20, g: 120, b: 200 } } }).png().toBuffer();

    await request(app).put(`${API_BASE}/me/avatar`).set("Cookie", sessionCookie(session.token)).set("Content-Type", "image/png").send(png).expect(200);

    const response = await request(app).get(`${API_BASE}/users/sam/avatar`).expect(200);
    expect(response.headers["content-type"]).toBe("image/jpeg");
    const metadata = await sharp(Buffer.from(response.body as Uint8Array)).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(256);
    expect(metadata.height).toBe(128);
  });

  it("rejects invalid avatar bytes", async () => {
    const { session } = await registerUser(app, "alex@example.com", "alex");
    const response = await request(app)
      .put(`${API_BASE}/me/avatar`)
      .set("Cookie", sessionCookie(session.token))
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("not an image"))
      .expect(400);
    expect(response.body).toMatchObject({ error: "Avatar must be a supported image under the upload and output limits" });
  });

  it("deletes an avatar", async () => {
    const { session } = await registerUser(app, "maya@example.com", "maya");
    const png = await sharp({ create: { width: 128, height: 128, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
    await request(app).put(`${API_BASE}/me/avatar`).set("Cookie", sessionCookie(session.token)).set("Content-Type", "image/png").send(png).expect(200);

    await request(app).delete(`${API_BASE}/me/avatar`).set("Cookie", sessionCookie(session.token)).expect(200);
    const response = await request(app).get(`${API_BASE}/users/maya/avatar`).expect(404);
    expect(response.body).toMatchObject({ error: "Avatar not found" });
  });

  it("returns user not found for unknown handles", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing/avatar`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });
});
