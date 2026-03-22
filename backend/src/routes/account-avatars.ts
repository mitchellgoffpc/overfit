import { API_BASE } from "@underfit/types";
import express from "express";
import sharp from "sharp";

import type { Database } from "db";
import type { Empty, RouteApp, RouteHandler } from "helpers";
import { deleteAccountAvatar, getAccountAvatar, upsertAccountAvatar } from "repositories/account-avatars";
import { getAccount } from "repositories/accounts";
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

const sendAvatar = (avatar: Buffer, res: express.Response) => {
  res.setHeader("Content-Type", "image/jpeg");
  res.send(Buffer.from(avatar));
};

export function registerAccountAvatarRoutes(app: RouteApp, db: Database): void {
  const getAccountAvatarHandler: RouteHandler<{ handle: string }, Buffer> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const account = await getAccount(db, handle);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const avatar = await getAccountAvatar(db, handle);
    if (!avatar) {
      res.status(404).json({ error: "Avatar not found" });
      return;
    }

    sendAvatar(Buffer.from(avatar.image), res);
  };

  const putCurrentUserAvatarHandler: RouteHandler<Empty, { status: "ok" }, Buffer> = async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      res.status(400).json({ error: "Avatar upload must include raw bytes" });
      return;
    }

    const image = await processAvatar(req.body).catch(() => undefined);
    if (!image) {
      res.status(400).json({ error: "Avatar must be a supported image under the upload and output limits" });
      return;
    }

    await upsertAccountAvatar(db, req.user.id, image);
    res.json({ status: "ok" });
  };

  const deleteCurrentUserAvatarHandler: RouteHandler<Empty, { status: "ok" }> = async (req, res) => {
    await deleteAccountAvatar(db, req.user.id);
    res.json({ status: "ok" });
  };

  app.get(`${API_BASE}/accounts/:handle/avatar`, getAccountAvatarHandler);
  app.put(`${API_BASE}/me/avatar`, requireAuth(db), express.raw({ type: "*/*", limit: AVATAR_UPLOAD_LIMIT }), putCurrentUserAvatarHandler);
  app.delete(`${API_BASE}/me/avatar`, requireAuth(db), deleteCurrentUserAvatarHandler);
}
