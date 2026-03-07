import type { Organization, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getAccountByHandle } from "repositories/accounts";
import type { ErrorResponse, RouteApp } from "routes/helpers";

interface HandleExistsQuery { handle?: string }
interface ExistsResponse { exists: boolean }

export function registerAccountRoutes(app: RouteApp, apiBase: string, db: Database): void {
  const handleExistsHandler: RequestHandler<Record<string, string>, ExistsResponse | ErrorResponse, undefined, HandleExistsQuery> = async (req, res) => {
    const handle = req.query.handle?.trim() ?? "";
    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
    } else {
      res.json({ exists: Boolean(await getAccountByHandle(db, handle)) });
    }
  };

  const getAccountByHandleHandler: RequestHandler<{ handle?: string }, User | Organization | ErrorResponse> = async (req, res) => {
    const handle = req.params.handle?.trim() ?? "";
    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
      return;
    }

    const account = await getAccountByHandle(db, handle);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.json(account);
    }
  };

  app.get(`${apiBase}/accounts/handle-exists`, handleExistsHandler);
  app.get(`${apiBase}/accounts/:handle`, getAccountByHandleHandler);
}
