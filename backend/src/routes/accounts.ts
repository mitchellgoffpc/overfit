import { API_BASE } from "@underfit/types";
import type { Organization, Project, Run, User } from "@underfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getAccount, getAccountByHandle } from "repositories/accounts";
import { getProjectByHandleAndName } from "repositories/projects";
import { getRunByHandleProjectNameAndName } from "repositories/runs";
import type { ErrorResponse, RouteApp } from "routes/helpers";

interface HandleExistsQuery { handle?: string }
interface ExistsResponse { exists: boolean }

export function registerAccountRoutes(app: RouteApp, db: Database): void {
  const handleExistsHandler: RequestHandler<Record<string, string>, ExistsResponse | ErrorResponse, undefined, HandleExistsQuery> = async (req, res) => {
    const handle = req.query.handle?.trim() ?? "";
    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
    } else {
      res.json({ exists: Boolean(await getAccountByHandle(db, handle)) });
    }
  };

  const getAccountHandler: RequestHandler<{ id?: string }, User | Organization | ErrorResponse> = async (req, res) => {
    const id = req.params.id?.trim() ?? "";
    if (!id) {
      res.status(400).json({ error: "Account ID is required" });
      return;
    }

    const account = await getAccount(db, id);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.json(account);
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

  const getProjectByHandleHandler: RequestHandler<{ handle?: string; projectName?: string }, Project | ErrorResponse> = async (req, res) => {
    const handle = req.params.handle?.trim() ?? "";
    const projectName = req.params.projectName?.trim() ?? "";
    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
    } else if (!projectName) {
      res.status(400).json({ error: "Project name is required" });
    } else {
      const project = await getProjectByHandleAndName(db, handle, projectName);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
      } else {
        res.json(project);
      }
    }
  };

  const getRunByHandleHandler: RequestHandler<{ handle?: string; projectName?: string; runName?: string }, Run | ErrorResponse> = async (req, res) => {
    const handle = req.params.handle?.trim() ?? "";
    const projectName = req.params.projectName?.trim() ?? "";
    const runName = req.params.runName?.trim() ?? "";
    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
    } else if (!projectName) {
      res.status(400).json({ error: "Project name is required" });
    } else if (!runName) {
      res.status(400).json({ error: "Run name is required" });
    } else {
      const run = await getRunByHandleProjectNameAndName(db, handle, projectName, runName);
      if (!run) {
        res.status(404).json({ error: "Run not found" });
      } else {
        res.json(run);
      }
    }
  };

  app.get(`${API_BASE}/accounts/handle-exists`, handleExistsHandler);
  app.get(`${API_BASE}/accounts/by-handle/:handle`, getAccountByHandleHandler);
  app.get(`${API_BASE}/accounts/by-handle/:handle/projects/:projectName`, getProjectByHandleHandler);
  app.get(`${API_BASE}/accounts/by-handle/:handle/projects/:projectName/runs/:runName`, getRunByHandleHandler);
  app.get(`${API_BASE}/accounts/:id`, getAccountHandler);
}
