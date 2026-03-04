import type { User } from "@overfit/types";

import type { ErrorResponse, RouteApp, RouteParams, RouteRequest, RouteResponse, UpsertUserPayload } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerUserRoutes(app: RouteApp, apiBase: string, users: EntityStore<User>): void {
  app.get(`${apiBase}/users`, (_req: RouteRequest, res: RouteResponse<User[]>) => {
    res.json(users.list());
  });

  app.get(`${apiBase}/users/:id`, (req: RouteRequest<RouteParams>, res: RouteResponse<User | ErrorResponse>) => {
    const user = users.get(req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  });

  app.put(
    `${apiBase}/users/:id`,
    (req: RouteRequest<RouteParams, User | ErrorResponse, UpsertUserPayload>, res: RouteResponse<User | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = users.get(id);

    const email = payload.email ?? existing?.email;
    const displayName = payload.displayName ?? existing?.displayName;

    for (const [label, value] of Object.entries({ email, displayName })) {
      if (!value) {
        res.status(400).json({ error: `User ${label} is required` });
        return;
      }
    }

    const user: User = {
      id,
      email,
      displayName,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
      updatedAt: nowIso()
    };

    users.upsert(user);
    res.json(user);
  });
}
