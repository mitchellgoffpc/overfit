import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { useAccountsStore } from "stores/accounts";
import { loadAuth, signup, useAuthStore } from "stores/auth";
import { fetchLogs, useLogStore } from "stores/logs";
import { fetchProject, fetchProjects, useProjectStore } from "stores/projects";
import { buildRunKey, fetchRun, fetchRuns, useRunStore } from "stores/runs";
import { fetchScalars, useScalarStore } from "stores/scalars";
import { fetchWorkers, useWorkerStore } from "stores/workers";

const getPort = async (): Promise<number> => await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") { reject(new Error("Failed to allocate port")); return; }
    server.close(() => { resolve(address.port); });
  });
});

const getPython = (): string | null => {
  for (const command of ["python3", "python"]) {
    const result = spawnSync(command, ["-c", "import sys; sys.path.insert(0, '../api'); import uvicorn, underfit_api"], { cwd: process.cwd() });
    if (result.status === 0) { return command; }
  }
  return null;
};

const python = getPython();

describe.skipIf(!python).sequential("store integration", () => {
  let api: ChildProcess | null = null;
  let apiOrigin = "";
  let apiRoot = "";
  let cookie = "";
  let stderr = "";
  const realFetch = Reflect.get(globalThis, "__underfitFetch__") as typeof fetch;
  const tempDir = mkdtempSync(join(tmpdir(), "underfit-frontend-"));

  beforeAll(async () => {
    if (!python) { return; }
    const port = await getPort();
    apiOrigin = `http://127.0.0.1:${String(port)}`;
    apiRoot = `${apiOrigin}/api/v1`;
    writeFileSync(join(tempDir, "underfit.toml"), [
      "[database]",
      'type = "sqlite"',
      `path = "${join(tempDir, "test.sqlite")}"`,
      "",
      "[storage]",
      'type = "file"',
      `base = "${join(tempDir, "storage")}"`
    ].join("\n"));
    api = spawn(python, ["-m", "uvicorn", "underfit_api.main:app", "--host", "127.0.0.1", "--port", String(port), "--app-dir", "../api"], {
      cwd: process.cwd(),
      env: { ...process.env, UNDERFIT_APP_SECRET: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=", UNDERFIT_CONFIG: join(tempDir, "underfit.toml") }
    });
    api.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    globalThis.fetch = (async (input, init) => {
      if (typeof input !== "string") { return await realFetch(input, init); }
      const headers = new Headers(init?.headers);
      if (cookie) { headers.set("cookie", cookie); }
      const response = await realFetch(input.startsWith("http") ? input : `${apiOrigin}${input}`, { ...init, headers });
      const nextCookie = response.headers.get("set-cookie");
      if (nextCookie) { cookie = nextCookie.split(";", 1)[0] ?? ""; }
      return response;
    }) as typeof fetch;
    for (let i = 0; i < 100; i += 1) {
      const response = await realFetch(`${apiRoot}/health`).catch(() => null);
      if (response?.ok) { return; }
      await new Promise((resolve) => { setTimeout(resolve, 50); });
    }
    throw new Error(`API failed to start\n${stderr}`);
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
    api?.kill("SIGTERM");
    rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    cookie = "";
    useAuthStore.setState({ status: "idle", currentHandle: null });
    useAccountsStore.setState({ accounts: {}, notFoundHandles: new Set(), avatarVersion: 0, membershipsByUser: {}, membersByOrganization: {} });
    useProjectStore.setState({ projects: {}, collaborators: {}, isLoading: false, error: null });
    useRunStore.setState({ runs: {}, isLoading: {}, errors: {} });
    useScalarStore.setState({ scalars: {}, isLoading: {}, errors: {} });
    useWorkerStore.setState({ workers: {}, isLoading: {}, errors: {} });
    useLogStore.setState({ logs: {} });
  });

  it("writes through real endpoints and reads through stores", async () => {
    expect(await signup("ada@example.com", "ada", "password123")).toEqual({ ok: true });
    useAuthStore.setState({ status: "idle", currentHandle: null });
    useAccountsStore.setState({ accounts: {}, notFoundHandles: new Set(), avatarVersion: 0, membershipsByUser: {}, membersByOrganization: {} });
    await loadAuth();

    expect(useAuthStore.getState()).toEqual({ status: "authenticated", currentHandle: "ada" });
    expect(useAccountsStore.getState().accounts["ada"]?.type).toBe("USER");

    const projectResponse = await fetch(`${apiRoot}/accounts/ada/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "demo", visibility: "private" })
    });
    expect(projectResponse.ok).toBe(true);

    const launchResponse = await fetch(`${apiRoot}/accounts/ada/projects/demo/runs/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runName: "train", launchId: "launch-1" })
    });
    expect(launchResponse.ok).toBe(true);
    const { workerToken } = await launchResponse.json() as { workerToken: string };

    expect((await fetch(`${apiRoot}/ingest/scalars`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startLine: 0,
        scalars: [
          { step: 1, values: { loss: 0.5 }, timestamp: "2025-01-01T00:00:00Z" },
          { step: 2, values: { loss: 0.25 }, timestamp: "2025-01-01T00:00:01Z" }
        ]
      })
    })).ok).toBe(true);
    expect((await fetch(`${apiRoot}/ingest/logs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startLine: 0,
        lines: [
          { timestamp: "2025-01-01T00:00:00Z", content: "started" },
          { timestamp: "2025-01-01T00:00:01Z", content: "finished" }
        ]
      })
    })).ok).toBe(true);

    await fetchProjects("ada");
    await fetchProject("ada", "demo");
    await fetchRuns("ada", "demo");
    await fetchRun("ada", "demo", "train");
    await fetchScalars("ada", "demo", "train");
    await fetchWorkers("ada", "demo", "train");
    await fetchLogs("ada", "demo", "train", "0");

    const runKey = buildRunKey("ada", "demo", "train");
    expect(useProjectStore.getState().projects["ada/demo"]?.name).toBe("demo");
    expect(useRunStore.getState().runs[runKey]?.name).toBe("train");
    expect(useScalarStore.getState().scalars[runKey]?.series["loss"]?.values).toEqual([0.5, 0.25]);
    expect(useWorkerStore.getState().workers[runKey]?.map((worker) => worker.workerLabel)).toEqual(["0"]);
    expect(useLogStore.getState().logs["ada/demo/train/0"]?.lines.map((line) => line.message)).toEqual(["started", "finished"]);
  });
});
