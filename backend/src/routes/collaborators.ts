import { API_BASE } from "@underfit/types";
import type { Collaborator, User } from "@underfit/types";

import type { Database } from "db";
import type { RouteApp, RouteHandler } from "helpers";
import { getAccount } from "repositories/accounts";
import { createCollaborator, deleteCollaborator, getCollaborator, listCollaborators } from "repositories/collaborators";
import { getOrganizationMember } from "repositories/organization-members";
import { getProject } from "repositories/projects";
import { getUserByHandle } from "repositories/users";
import { requireAuth } from "routes/auth";

export function registerCollaboratorRoutes(app: RouteApp, db: Database): void {
  const isProjectAdmin = async (database: Database, accountId: string, accountType: string, userId: string): Promise<boolean> => {
    if (accountType === "USER") {
      return accountId === userId;
    } else {
      const member = await getOrganizationMember(database, accountId, userId);
      return member?.role === "ADMIN";
    }
  };

  const listCollaboratorsHandler: RouteHandler<{ handle: string; projectName: string }, User[]> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const project = await getProject(db, handle, projectName);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(await listCollaborators(db, project.id));
    }
  };

  const addCollaboratorHandler: RouteHandler<{ handle: string; projectName: string; userHandle: string }, Collaborator> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const userHandle = req.params.userHandle.trim().toLowerCase();
    const account = await getAccount(db, handle);
    const project = account ? await getProject(db, handle, projectName) : undefined;
    const targetUser = await getUserByHandle(db, userHandle);

    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else if (!targetUser) {
      res.status(404).json({ error: "User not found" });
    } else if (!await isProjectAdmin(db, account.id, account.type, req.user.id)) {
      res.status(403).json({ error: "Forbidden" });
    } else {
      const collaborator = await createCollaborator(db, project.id, targetUser.id);
      if (!collaborator) {
        res.status(409).json({ error: "User is already a collaborator" });
      } else {
        res.json(collaborator);
      }
    }
  };

  const deleteCollaboratorHandler: RouteHandler<{ handle: string; projectName: string; userHandle: string }, { ok: true }> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const userHandle = req.params.userHandle.trim().toLowerCase();
    const account = await getAccount(db, handle);
    const project = account ? await getProject(db, handle, projectName) : undefined;
    const targetUser = await getUserByHandle(db, userHandle);

    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else if (!targetUser) {
      res.status(404).json({ error: "User not found" });
    } else if (!await isProjectAdmin(db, account.id, account.type, req.user.id)) {
      res.status(403).json({ error: "Forbidden" });
    } else if (!await getCollaborator(db, project.id, targetUser.id)) {
      res.status(404).json({ error: "Collaborator not found" });
    } else {
      await deleteCollaborator(db, project.id, targetUser.id);
      res.json({ ok: true });
    }
  };

  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/collaborators`, listCollaboratorsHandler);
  app.put(`${API_BASE}/accounts/:handle/projects/:projectName/collaborators/:userHandle`, requireAuth(db), addCollaboratorHandler);
  app.delete(`${API_BASE}/accounts/:handle/projects/:projectName/collaborators/:userHandle`, requireAuth(db), deleteCollaboratorHandler);
}
