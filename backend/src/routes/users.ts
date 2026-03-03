import type { User } from "@app/shared";
import type { Request, Response } from "express";

import type { ErrorResponse, ID, RouteApp } from "routes/helpers";
import { nowIso } from "routes/time";
import type { EntityStore } from "storage/types";

export function registerUserRoutes(app: RouteApp, apiBase: string, users: EntityStore<User>): void {
  app.get(`${apiBase}/users`, (_req: Request, res: Response<User[]>) => {
    res.json(users.list());
  });

  app.get(`${apiBase}/users/:id`, (req: Request<{ id: ID }>, res: Response<User | ErrorResponse>) => {
    const user = users.get(req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  });

  app.put(`${apiBase}/users/:id`, (req: Request<{ id: ID }, User | ErrorResponse, Partial<User>>, res: Response<User | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body;
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

    users.upsert(user);
    res.json(user);
  });
}
