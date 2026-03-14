import { API_BASE } from "@underfit/types";
import type { Organization, User } from "@underfit/types";

import type { Database } from "db";
import type { RouteApp, RouteHandler } from "helpers";
import { getAccount } from "repositories/accounts";

export function registerAccountRoutes(app: RouteApp, db: Database): void {
  const handleExistsHandler: RouteHandler<{ handle: string }, { exists: boolean }> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
    } else {
      res.json({ exists: Boolean(await getAccount(db, handle)) });
    }
  };

  const getAccountHandler: RouteHandler<{ handle: string }, User | Organization> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const account = await getAccount(db, handle);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.json(account);
    }
  };

  app.get(`${API_BASE}/accounts/:handle/exists`, handleExistsHandler);
  app.get(`${API_BASE}/accounts/:handle`, getAccountHandler);
}
