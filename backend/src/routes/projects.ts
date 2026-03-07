import { API_BASE, SESSION_INVALID_ERROR, SESSION_TOKEN_REQUIRED_ERROR, SESSION_USER_INVALID_ERROR } from "@overfit/types";
import type { Project } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getProject, listProjects, listProjectsByUserActivity, upsertProject } from "repositories/projects";
import { deleteSession, getSession } from "repositories/sessions";
import { getUser } from "repositories/users";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertProjectPayload = Partial<Omit<Project, "id" | "createdAt" | "updatedAt">>;

const resolveSessionToken = (value?: string) => {
  if (!value) { return undefined; }
  const [type, token] = value.split(" ");
  return type?.toLowerCase() === "bearer" && token ? token : value;
};

const getSessionToken = (headers: Record<string, string | string[] | undefined>) => {
  const headerValue = Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization;
  const sessionHeader = Array.isArray(headers["x-session-token"]) ? headers["x-session-token"][0] : headers["x-session-token"];
  const raw = resolveSessionToken(headerValue) ?? resolveSessionToken(sessionHeader);
  return raw?.trim();
};

export function registerProjectRoutes(app: RouteApp, db: Database): void {
  const listProjectsHandler: RequestHandler<Record<string, string>, Project[]> = async (_req, res) => {
    res.json(await listProjects(db));
  };

  const listMyProjectsHandler: RequestHandler<Record<string, string>, Project[] | ErrorResponse> = async (req, res) => {
    const token = getSessionToken(req.headers);
    if (!token) {
      res.status(401).json({ error: SESSION_TOKEN_REQUIRED_ERROR });
      return;
    }

    const session = await getSession(db, token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      if (session) { await deleteSession(db, token); }
      res.status(401).json({ error: SESSION_INVALID_ERROR });
      return;
    }

    const user = await getUser(db, session.userId);
    if (!user) {
      res.status(401).json({ error: SESSION_USER_INVALID_ERROR });
      return;
    }

    res.json(await listProjectsByUserActivity(db, user.id));
  };

  const getProjectHandler: RequestHandler<RouteParams, Project | ErrorResponse> = async (req, res) => {
    const project = await getProject(db, req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(project);
    }
  };

  const upsertProjectHandler: RequestHandler<RouteParams, Project | ErrorResponse, UpsertProjectPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getProject(db, id);

    const name = req.body?.name ?? existing?.name;
    const accountId = req.body?.accountId ?? existing?.accountId;
    const missingFields = Object.entries({ name, accountId }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Project fields are required: ${missingFields.join(", ")}` });
    } else {
      const project = await upsertProject(db, {
        id,
        accountId: accountId,
        name: name,
        description: req.body?.description ?? existing?.description ?? null
      });
      res.json(project);
    }
  };

  app.get(`${API_BASE}/projects`, listProjectsHandler);
  app.get(`${API_BASE}/projects/me`, listMyProjectsHandler);
  app.get(`${API_BASE}/projects/:id`, getProjectHandler);
  app.put(`${API_BASE}/projects/:id`, upsertProjectHandler);
}
