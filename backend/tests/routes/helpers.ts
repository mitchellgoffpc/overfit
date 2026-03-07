import { API_BASE } from "@overfit/types";
import type { User } from "@overfit/types";
import request from "supertest";
import type { Response } from "supertest";
import { expect } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertUser } from "repositories/users";
import type { RouteApp } from "routes/helpers";

export { API_BASE } from "@overfit/types";

interface RejectCase { payload: Record<string, unknown>; error: string }

export const testTimestamp = "2025-01-01T00:00:00.000Z";
export const createTestDb = async (): Promise<Database> => (
  createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } })
);

export const createTestApp = (db: Database): RouteApp => createApp(db);

export async function get(app: RouteApp, resource: string, id: string, status = 200): Promise<Response> {
  return request(app)
    .get(`${API_BASE}/${resource}/${id}`)
    .expect(status);
}

export async function put(app: RouteApp, resource: string, id: string, payload: Record<string, unknown>, status = 200): Promise<Response> {
  return request(app)
    .put(`${API_BASE}/${resource}/${id}`)
    .send(payload)
    .expect(status);
}

export async function post(app: RouteApp, path: string, payload: Record<string, unknown>, status = 200): Promise<Response> {
  return request(app)
    .post(`${API_BASE}/${path}`)
    .send(payload)
    .expect(status);
}

export async function createUser(db: Database, input: { id: string; email: string; handle: string; displayName?: string }): Promise<User> {
  return await upsertUser(db, {
    id: input.id,
    email: input.email,
    handle: input.handle,
    displayName: input.displayName ?? input.handle
  });
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
