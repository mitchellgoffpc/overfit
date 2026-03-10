import { API_BASE } from "@underfit/types";
import type { Organization, User } from "@underfit/types";

import type { Database } from "db";
import { getAccount, getAccountByHandle } from "repositories/accounts";
import type { RouteApp, RouteHandler } from "routes/helpers";

export function registerAccountRoutes(app: RouteApp, db: Database): void {
  const handleExistsHandler: RouteHandler<Record<string, string>, { exists: boolean }, undefined, { handle?: string }> = async (req, res) => {
    const handle = req.query.handle?.trim().toLowerCase() ?? "";
    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
    } else {
      res.json({ exists: Boolean(await getAccountByHandle(db, handle)) });
    }
  };

  const getAccountHandler: RouteHandler<{ id: string }, User | Organization> = async (req, res) => {
    const id = req.params.id.trim();
    const account = await getAccount(db, id);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.json(account);
    }
  };

  const getAccountByHandleHandler: RouteHandler<{ handle: string }, User | Organization> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const account = await getAccountByHandle(db, handle);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.json(account);
    }
  };

  app.get(`${API_BASE}/accounts/handle-exists`, handleExistsHandler);
  app.get(`${API_BASE}/accounts/by-handle/:handle`, getAccountByHandleHandler);
  app.get(`${API_BASE}/accounts/:id`, getAccountHandler);
}
