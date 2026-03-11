import { API_BASE, testSlug } from "@underfit/types";
import type { Project } from "@underfit/types";

import type { Database } from "db";
import { getProject, getProjectByHandleAndName, getProjectRow, listProjects, listProjectsByHandle, listProjectsByUserActivity, upsertProject } from "repositories/projects";
import { requireAuth } from "routes/auth";
import type { RouteApp, RouteHandler, RouteParams } from "routes/helpers";

type UpsertProjectPayload = Partial<{ accountId: string; name: string; description: string | null }>;

export function registerProjectRoutes(app: RouteApp, db: Database): void {
  const listProjectsHandler: RouteHandler<Record<string, string>, Project[]> = async (_req, res) => {
    res.json(await listProjects(db));
  };

  const listMyProjectsHandler: RouteHandler<Record<string, string>, Project[]> = async (req, res) => {
    res.json(await listProjectsByUserActivity(db, req.user.id));
  };

  const listProjectsByHandleHandler: RouteHandler<{ handle: string }, Project[]> = async (req, res) => {
    res.json(await listProjectsByHandle(db, req.params.handle.trim().toLowerCase()));
  };

  const getProjectHandler: RouteHandler<RouteParams, Project> = async (req, res) => {
    const project = await getProject(db, req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(project);
    }
  };

  const upsertProjectHandler: RouteHandler<RouteParams, Project, UpsertProjectPayload> = async (req, res) => {
    const id = req.params.id;
    const existing = await getProjectRow(db, id);

    const name = (req.body.name ?? existing?.name ?? "").trim().toLowerCase();
    const accountId = req.body.accountId ?? existing?.accountId;
    const missingFields = Object.entries({ name, accountId }).filter(([, value]) => !value).map(([label]) => label);

    const nameError = testSlug(name);
    if (missingFields.length > 0) {
      res.status(400).json({ error: `Project fields are required: ${missingFields.join(", ")}` });
    } else if (nameError) {
      res.status(400).json({ error: nameError });
    } else {
      const project = await upsertProject(db, {
        id,
        accountId,
        name,
        description: req.body.description ?? existing?.description ?? null
      });
      res.json(project);
    }
  };

  const getProjectByHandleHandler: RouteHandler<{ handle: string; projectName: string }, Project> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const project = await getProjectByHandleAndName(db, handle, projectName);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(project);
    }
  };

  app.get(`${API_BASE}/projects`, listProjectsHandler);
  app.get(`${API_BASE}/projects/me`, requireAuth(db), listMyProjectsHandler);
  app.get(`${API_BASE}/accounts/by-handle/:handle/projects`, listProjectsByHandleHandler);
  app.get(`${API_BASE}/projects/:id`, getProjectHandler);
  app.put(`${API_BASE}/projects/:id`, upsertProjectHandler);
  app.get(`${API_BASE}/accounts/by-handle/:handle/projects/:projectName`, getProjectByHandleHandler);
}
