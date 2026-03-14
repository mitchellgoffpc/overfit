import { randomBytes } from "crypto";

import { API_BASE, testSlug } from "@underfit/types";
import type { Project } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { getAccount } from "repositories/accounts";
import { getProject, listProjects, listProjectsByUserActivity, upsertProject } from "repositories/projects";
import { requireAuth } from "routes/auth";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const UpsertProjectPayloadSchema = z.strictObject({
  description: z.string().nullable().exactOptional()
});

type UpsertProjectPayload = z.infer<typeof UpsertProjectPayloadSchema>;

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

  const upsertProjectHandler: RouteHandler<{ handle: string; projectName: string }, Project, UpsertProjectPayload> = async (req, res) => {
    const { handle, projectName } = req.params;
    const { success, error, data } = UpsertProjectPayloadSchema.safeParse(req.body);
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

      const existing = await getProject(db, handle, projectName);
      const project = await upsertProject(db, {
        id: existing?.id ?? randomBytes(16).toString("hex"),
        accountId: account.id,
        name: projectName,
        description: data.description ?? existing?.description ?? null
      });
      res.json(project);
    }
  };

  app.get(`${API_BASE}/me/projects`, requireAuth(db), listMyProjectsHandler);
  app.get(`${API_BASE}/accounts/:handle/projects`, listProjectsHandler);
  app.get(`${API_BASE}/accounts/:handle/projects/:projectName`, getProjectHandler);
  app.put(`${API_BASE}/accounts/:handle/projects/:projectName`, upsertProjectHandler);
}
