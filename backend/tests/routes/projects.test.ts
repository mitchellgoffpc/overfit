import { describe, expect, it } from "vitest";

import { assertNotFound, createTestApp, get, put } from "@overfit/backend/tests/routes/helpers";

describe("projects routes", () => {
  it("upserts and fetches a project", async () => {
    const app = createTestApp();
    const projectPayload = { name: "Overfit", description: "Tracking runs" };
    await put(app, "projects", "project-1", projectPayload);
    const response = await get(app, "projects", "project-1");
    expect(response.body).toMatchObject({ id: "project-1", ...projectPayload });
  });

  it("rejects unknown projects", async () => {
    const app = createTestApp();
    await assertNotFound(app, "projects", "missing", "Project not found");
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();
    const response = await put(app, "projects", "project-2", { description: "Missing name" }, 400);
    expect(response.body).toMatchObject({ error: "Project name is required" });
  });
});
