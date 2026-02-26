import type { Express, Request, Response } from "express";

import type { User } from "@app/shared";

import { nowIso, type ErrorResponse, type ID } from "./helpers";

type UserStore = Map<ID, User>;

export function registerUserRoutes(app: Express, apiBase: string, users: UserStore) {
  app.get(`${apiBase}/users/:id`, (req: Request, res: Response<User | ErrorResponse>) => {
    const user = users.get(req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  });

  app.put(`${apiBase}/users/:id`, (req: Request<unknown, User | ErrorResponse, Partial<User>>, res: Response<User | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body ?? {};
    const existing = users.get(id);

    const email = payload.email ?? existing?.email;
    const displayName = payload.displayName ?? existing?.displayName;

    if (!email) {
      res.status(400).json({ error: "User email is required" });
      return;
    }

    if (!displayName) {
      res.status(400).json({ error: "User displayName is required" });
      return;
    }

    const createdAt = existing?.createdAt ?? payload.createdAt ?? nowIso();

    const user: User = {
      id,
      email,
      displayName,
      createdAt,
      updatedAt: nowIso()
    };

    users.set(id, user);
    res.json(user);
  });
}
