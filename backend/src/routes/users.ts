import { API_BASE } from "@underfit/types";
import type { User } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { getUserByEmail, updateUser } from "repositories/users";
import { requireAuth } from "routes/auth";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const EmailExistsQuerySchema = z.strictObject({
  email: z.string().trim().min(1, "Email is required").prefault("")
});
const UpdateProfilePayloadSchema = z.strictObject({
  name: z.string().trim().min(1).exactOptional(),
  bio: z.string().trim().min(1).exactOptional()
});

type EmailExistsQuery = z.infer<typeof EmailExistsQuerySchema>;
type UpdateProfilePayload = z.infer<typeof UpdateProfilePayloadSchema>;

export function registerUserRoutes(app: RouteApp, db: Database): void {
  const emailExistsHandler: RouteHandler<Record<string, string>, { exists: boolean }, undefined, EmailExistsQuery> = async (req, res) => {
    const { success, error, data } = EmailExistsQuerySchema.safeParse(req.query);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else {
      res.json({ exists: Boolean(await getUserByEmail(db, data.email)) });
    }
  };

  const updateProfileHandler: RouteHandler<Record<string, string>, User, UpdateProfilePayload> = async (req, res) => {
    const { success, error, data } = UpdateProfilePayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }
    res.json(await updateUser(db, req.user.id, data));
  };

  const getCurrentUserHandler: RouteHandler<Record<string, string>, User> = (req, res) => {
    res.json(req.user);
  };

  app.get(`${API_BASE}/emails/exists`, emailExistsHandler);
  app.get(`${API_BASE}/me`, requireAuth(db), getCurrentUserHandler);
  app.patch(`${API_BASE}/me`, requireAuth(db), updateProfileHandler);
}
