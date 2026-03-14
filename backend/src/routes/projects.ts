import { API_BASE, testSlug } from "@underfit/types";
import type { Project } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { getAccount } from "repositories/accounts";
import { createProject, getProject, listProjects, listProjectsByUserActivity, updateProjectByName } from "repositories/projects";
import { requireAuth } from "routes/auth";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const CreateProjectPayloadSchema = z.strictObject({
  name: z.string(),
  description: z.string().nullable().exactOptional()
});
const UpdateProjectPayloadSchema = z.strictObject({
  description: z.string().nullable()
});

type CreateProjectPayload = z.infer<typeof CreateProjectPayloadSchema>;
type UpdateProjectPayload = z.infer<typeof UpdateProjectPayloadSchema>;

export function registerProjectRoutes(app: RouteApp, db: Database): void {
  const listMyProjectsHandler: RouteHandler<Record<string, string>, Project[]> = async (req, res) => {
    res.json(await listProjectsByUserActivity(db, req.user.id));
  };

  const listProjectsHandler: RouteHandler<{ handle: string }, Project[]> = async (req, res) => {
    res.json(await listProjects(db, req.params.handle.trim().toLowerCase()));
  };

  const getProjectHandler: RouteHandler<{ handle: string; projectName: string }, Project> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const project = await getProject(db, handle, projectName);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(project);
    }
  };

  const createProjectHandler: RouteHandler<{ handle: string }, Project, CreateProjectPayload> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const { success, error, data } = CreateProjectPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const name = data.name.trim().toLowerCase();
    if (testSlug(name)) {
      res.status(400).json({ error: "Invalid project name" });
      return;
    }

    const account = await getAccount(db, handle);
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const existing = await getProject(db, handle, name);
    if (existing) {
      res.status(409).json({ error: "Project already exists" });
      return;
    }

    res.json(await createProject(db, { accountId: account.id, name, description: data.description ?? null }));
  };

  const updateProjectHandler: RouteHandler<{ handle: string; projectName: string }, Project, UpdateProjectPayload> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const { success, error, data } = UpdateProjectPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (testSlug(projectName)) {
      res.status(400).json({ error: "Invalid project name" });
    } else {
      const account = await getAccount(db, handle);
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }

      const project = await updateProjectByName(db, handle, projectName, { description: data.description });
      if (!project) {
        res.status(404).json({ error: "Project not found" });
      } else {
        res.json(project);
      }
    }
  };

  app.get(`${API_BASE}/me/projects`, requireAuth(db), listMyProjectsHandler);
  app.get(`${API_BASE}/accounts/:handle/projects`, listProjectsHandler);
  app.post(`${API_BASE}/accounts/:handle/projects`, createProjectHandler);
  app.get(`${API_BASE}/accounts/:handle/projects/:projectName`, getProjectHandler);
  app.put(`${API_BASE}/accounts/:handle/projects/:projectName`, updateProjectHandler);
}
