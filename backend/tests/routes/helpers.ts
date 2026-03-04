import { API_VERSION } from "@overfit/types";
import request from "supertest";
import type { Response } from "supertest";
import { expect } from "vitest";

import { createApp } from "app";
import type { RouteApp } from "routes/helpers";

interface RejectCase { payload: Record<string, unknown>; error: string }

export const apiBase = `/api/${API_VERSION}`;
export const testTimestamp = "2025-01-01T00:00:00.000Z";
export const createTestApp = (): RouteApp => createApp({ server: { port: 4000 }, storage: { type: "sqlite", sqlite: { path: ":memory:" } } });

export async function get(app: RouteApp, resource: string, id: string, status = 200): Promise<Response> {
  return request(app)
    .get(`${apiBase}/${resource}/${id}`)
    .expect(status);
}

export async function put(
  app: RouteApp,
  resource: string,
  id: string,
  payload: Record<string, unknown>,
  status = 200
): Promise<Response> {
  return request(app)
    .put(`${apiBase}/${resource}/${id}`)
    .send(payload)
    .expect(status);
}

export async function post(
  app: RouteApp,
  path: string,
  payload: Record<string, unknown>,
  status = 200
): Promise<Response> {
  return request(app)
    .post(`${apiBase}/${path}`)
    .send(payload)
    .expect(status);
}

export async function assertRejectCases(app: RouteApp, resource: string, cases: RejectCase[], status = 400): Promise<void> {
  for (const [index, testCase] of cases.entries()) {
    const response = await put(app, resource, `reject-${String(index)}`, testCase.payload, status);
    expect(response.body).toMatchObject({ error: testCase.error });
  }
}

export async function assertNotFound(app: RouteApp, resource: string, id: string, error: string): Promise<void> {
  const response = await get(app, resource, id, 404);
  expect(response.body).toMatchObject({ error });
}

export async function seedProject(app: RouteApp, id = "project-1", name = "Overfit"): Promise<void> {
  await put(app, "projects", id, { name });
}

export async function seedRun(
  app: RouteApp,
  { runId = "run-1", projectId = "project-1", name = "Run 1", status = "running" } = {}
): Promise<void> {
  await put(app, "runs", runId, { projectId, name, status });
}

export async function seedProjectAndRun(
  app: RouteApp,
  { projectId = "project-1", projectName = "Overfit", runId = "run-1", runName = "Run 1", status = "running" } = {}
): Promise<void> {
  await seedProject(app, projectId, projectName);
  await seedRun(app, { runId, projectId, name: runName, status });
}
