import { randomBytes, randomInt } from "crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { API_BASE } from "@underfit/types";
import type { Run } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { getProject } from "repositories/projects";
import { getRun, insertRun, listProjectRuns, listUserRuns, updateRun } from "repositories/runs";
import { getUserByHandle } from "repositories/users";
import { requireAuth } from "routes/auth";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const InsertRunPayloadSchema = z.strictObject({
  status: z.string().min(1, "Run fields are required: status").prefault(""),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});
const UpdateRunPayloadSchema = z.strictObject({
  status: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

type InsertRunPayload = z.infer<typeof InsertRunPayloadSchema>;
type UpdateRunPayload = z.infer<typeof UpdateRunPayloadSchema>;

const parseWordList = (relativePath: string): string[] => fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf-8").split(/\r?\n/).map((word) => word.trim()).filter(Boolean);
const adjectives = parseWordList("../../src/wordlists/adjectives.txt");
const nouns = parseWordList("../../src/wordlists/nouns.txt");
const randomWord = (words: string[]): string => {
  if (!words.length) { throw new Error("Word list is empty"); }
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

  const insertRunHandler: RouteHandler<{ handle: string; projectName: string }, Run, InsertRunPayload> = async (req, res) => {
    const { success, error, data: { status, metadata } = {} } = InsertRunPayloadSchema.safeParse(req.body);
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
      let runName = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = randomRunName();
        if (!await getRun(db, handle, projectName, candidate)) {
          runName = candidate;
          break;
        }
      }
      if (!runName) {
        res.status(500).json({ error: "Unable to allocate run name" });
      } else {
        const run = await insertRun(db, {
          id: randomBytes(16).toString("hex"),
          projectId: project.id,
          userId: req.user.id,
          name: runName,
          status,
          metadata: metadata ?? null
        });
        res.json(run);
      }
    }
  };

  const updateRunHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Run, UpdateRunPayload> = async (req, res) => {
    const { success, error, data: { status, metadata } = {} } = UpdateRunPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const existing = await getRun(db, handle, projectName, runName);
    if (!existing) {
      res.status(404).json({ error: "Run not found" });
    } else {
      const run = await updateRun(db, existing.id, { status, metadata });
      res.json(run ?? existing);
    }
  };

  app.get(`${API_BASE}/users/:handle/runs`, listUserRunsHandler);
  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs`, listProjectRunsHandler);
  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName`, getRunHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs`, requireAuth(db), insertRunHandler);
  app.put(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName`, updateRunHandler);
}
