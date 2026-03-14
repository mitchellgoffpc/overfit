import { randomInt } from "crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { API_BASE, runStatus } from "@underfit/types";
import type { Run } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { getProject } from "repositories/projects";
import { createRun, getRun, listProjectRuns, listUserRuns, updateRun } from "repositories/runs";
import { getUserByHandle } from "repositories/users";
import { requireAuth } from "routes/auth";

const CreateRunPayloadSchema = z.strictObject({
  status: z.enum(runStatus).exactOptional().prefault("queued"),
  metadata: z.record(z.string(), z.unknown()).nullable().exactOptional().prefault(null)
});
const UpdateRunPayloadSchema = z.strictObject({
  status: z.enum(runStatus).exactOptional(),
  metadata: z.record(z.string(), z.unknown()).nullable().exactOptional()
});

type CreateRunPayload = z.infer<typeof CreateRunPayloadSchema>;
type UpdateRunPayload = z.infer<typeof UpdateRunPayloadSchema>;

const parseWordList = (relativePath: string): string[] => fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf-8").split(/\r?\n/).map((word) => word.trim()).filter(Boolean);
const adjectives = parseWordList("../../src/wordlists/adjectives.txt");
const nouns = parseWordList("../../src/wordlists/nouns.txt");
const randomWord = (words: string[]): string => {
  if (!words[0]) { throw new Error("Word list is empty"); }
  return words[randomInt(words.length)] ?? words[0];
};
const randomRunName = (): string => `${randomWord(adjectives)}-${randomWord(nouns)}`;

export function registerRunRoutes(app: RouteApp, db: Database): void {
  const listUserRunsHandler: RouteHandler<{ handle: string }, Run[]> = async (req, res) => {
    const user = await getUserByHandle(db, req.params.handle.trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(await listUserRuns(db, user.id));
    }
  };

  const listProjectRunsHandler: RouteHandler<{ handle: string; projectName: string }, Run[]> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const project = await getProject(db, handle, projectName);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(await listProjectRuns(db, handle, projectName));
    }
  };

  const getRunHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Run> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRun(db, handle, projectName, runName);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      res.json(run);
    }
  };

  const createRunHandler: RouteHandler<{ handle: string; projectName: string }, Run, CreateRunPayload> = async (req, res) => {
    const { success, error, data } = CreateRunPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const project = await getProject(db, handle, projectName);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      let run: Run | undefined;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        run = await createRun(db, { projectId: project.id, userId: req.user.id, name: randomRunName(), ...data });
        if (run) { break; }
      }
      if (!run) {
        res.status(500).json({ error: "Unable to allocate run name" });
      } else {
        res.json(run);
      }
    }
  };

  const updateRunHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Run, UpdateRunPayload> = async (req, res) => {
    const { success, error, data } = UpdateRunPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await updateRun(db, handle, projectName, runName, data);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      res.json(run);
    }
  };

  app.get(`${API_BASE}/users/:handle/runs`, listUserRunsHandler);
  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs`, listProjectRunsHandler);
  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName`, getRunHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs`, requireAuth(db), createRunHandler);
  app.put(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName`, updateRunHandler);
}
