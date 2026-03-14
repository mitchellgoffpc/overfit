import { API_BASE } from "@underfit/types";
import express from "express";
import sharp from "sharp";

import type { Database } from "db";
import type { RouteApp, RouteHandler } from "helpers";
import { deleteUserAvatar, getUserAvatar, upsertUserAvatar } from "repositories/user-avatars";
import { getUserByHandle } from "repositories/users";
import { requireAuth } from "routes/auth";

const AVATAR_OUTPUT_LIMIT_BYTES = 64 * 1024;
const AVATAR_MAX_DIMENSION = 256;
const AVATAR_MAX_INPUT_PIXELS = 40_000_000;
const AVATAR_UPLOAD_LIMIT = "5mb";

const processAvatar = async (input: Buffer): Promise<Buffer | undefined> => {
  const image = sharp(input, { limitInputPixels: AVATAR_MAX_INPUT_PIXELS }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) { return undefined; }
  const output = await image.resize({
    width: AVATAR_MAX_DIMENSION,
    height: AVATAR_MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true
  }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return output.length <= AVATAR_OUTPUT_LIMIT_BYTES ? output : undefined;
};

export function registerUserAvatarRoutes(app: RouteApp, db: Database): void {
  const getUserAvatarHandler: RouteHandler<{ handle: string }, Buffer> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const user = await getUserByHandle(db, handle);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const avatar = await getUserAvatar(db, handle);
    if (!avatar) {
      res.status(404).json({ error: "Avatar not found" });
    } else {
      res.setHeader("Content-Type", "image/jpeg");
      res.send(Buffer.from(avatar.image));
    }
  };

  const putCurrentUserAvatarHandler: RouteHandler<Record<string, string>, { status: "ok" }, Buffer> = async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      res.status(400).json({ error: "Avatar upload must include raw bytes" });
      return;
    }

    const image = await processAvatar(req.body).catch(() => undefined);
    if (!image) {
      res.status(400).json({ error: "Avatar must be a supported image under the upload and output limits" });
      return;
    }

    await upsertUserAvatar(db, req.user.id, image);
    res.json({ status: "ok" });
  };

  const deleteCurrentUserAvatarHandler: RouteHandler<Record<string, string>, { status: "ok" }> = async (req, res) => {
    await deleteUserAvatar(db, req.user.id);
    res.json({ status: "ok" });
  };

  app.get(`${API_BASE}/users/:handle/avatar`, getUserAvatarHandler);
  app.put(`${API_BASE}/me/avatar`, requireAuth(db), express.raw({ type: "*/*", limit: AVATAR_UPLOAD_LIMIT }), putCurrentUserAvatarHandler);
  app.delete(`${API_BASE}/me/avatar`, requireAuth(db), deleteCurrentUserAvatarHandler);
}
