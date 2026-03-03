import { API_VERSION } from "@app/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";


import { createApp } from "./app";

const apiBase = `/api/${API_VERSION}`;
const createTestApp = () => createApp({ storageConfig: { type: "sqlite", sqlitePath: ":memory:" } });

describe("backend api", () => {
  it("upserts and fetches a user", async () => {
    const app = createTestApp();

    const userPayload = {
      email: "ada@example.com",
      displayName: "Ada Lovelace"
    };

    const upsertResponse = await request(app)
      .put(`${apiBase}/users/user-1`)
      .send(userPayload)
      .expect(200);

    expect(upsertResponse.body).toMatchObject({
      id: "user-1",
      ...userPayload
    });

    const getResponse = await request(app)
      .get(`${apiBase}/users/user-1`)
      .expect(200);

    expect(getResponse.body).toMatchObject({
      id: "user-1",
      ...userPayload
    });
  });

  it("upserts and fetches a team", async () => {
    const app = createTestApp();

    const teamPayload = {
      name: "Core",
      slug: "core"
    };

    await request(app)
      .put(`${apiBase}/teams/team-1`)
      .send(teamPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/teams/team-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "team-1",
      ...teamPayload
    });
  });

  it("upserts and fetches a project", async () => {
    const app = createTestApp();

    const projectPayload = {
      name: "Overfit",
      description: "Tracking runs"
    };

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send(projectPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/projects/project-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "project-1",
      ...projectPayload
    });
  });

  it("upserts and fetches a run", async () => {
    const app = createTestApp();

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send({ name: "Overfit" })
      .expect(200);

    const runPayload = {
      projectId: "project-1",
      name: "Run 1",
      status: "running",
      metadata: { lr: 0.001 }
    };

    await request(app)
      .put(`${apiBase}/runs/run-1`)
      .send(runPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/runs/run-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "run-1",
      ...runPayload
    });
  });

  it("upserts and fetches an artifact", async () => {
    const app = createTestApp();

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send({ name: "Overfit" })
      .expect(200);

    await request(app)
      .put(`${apiBase}/runs/run-1`)
      .send({ projectId: "project-1", name: "Run 1", status: "running" })
      .expect(200);

    const artifactPayload = {
      runId: "run-1",
      name: "model",
      type: "model",
      version: "v1",
      uri: "s3://bucket/model"
    };

    await request(app)
      .put(`${apiBase}/artifacts/artifact-1`)
      .send(artifactPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/artifacts/artifact-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "artifact-1",
      ...artifactPayload
    });
  });

  it("upserts and fetches a metric", async () => {
    const app = createTestApp();

    await request(app)
      .put(`${apiBase}/projects/project-1`)
      .send({ name: "Overfit" })
      .expect(200);

    await request(app)
      .put(`${apiBase}/runs/run-1`)
      .send({ projectId: "project-1", name: "Run 1", status: "running" })
      .expect(200);

    const metricPayload = {
      runId: "run-1",
      name: "accuracy",
      value: 0.98,
      step: 10,
      timestamp: new Date("2025-01-01T00:00:00.000Z").toISOString()
    };

    await request(app)
      .put(`${apiBase}/metrics/metric-1`)
      .send(metricPayload)
      .expect(200);

    const response = await request(app)
      .get(`${apiBase}/metrics/metric-1`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "metric-1",
      ...metricPayload
    });
  });
});
