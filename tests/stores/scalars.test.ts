import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRunKey } from "stores/runs";
import { fetchScalars, useScalarStore } from "stores/scalars";
import { API_BASE } from "types";
import type { Scalar } from "types";

const scalar: Scalar = {
  step: 1,
  values: { loss: 0.5 },
  timestamp: "2025-01-01T00:00:00.000Z"
};

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("scalar store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useScalarStore.setState({ scalars: {}, isLoading: {}, errors: {} });
    vi.restoreAllMocks();
  });

  it("fetches scalars with cookie credentials", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([scalar]));
    const runKey = buildRunKey("ada", "demo", "run-1");

    await fetchScalars("ada", "demo", "run-1");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/accounts/ada/projects/demo/runs/run-1/scalars`,
      { credentials: "include" }
    );
    expect(useScalarStore.getState().scalars[runKey]).toEqual([scalar]);
    expect(useScalarStore.getState().isLoading[runKey]).toBe(false);
    expect(useScalarStore.getState().errors[runKey]).toBeNull();
  });

  it("fetches multiple runs and stores them separately", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([scalar]));
    fetchMock.mockResolvedValueOnce(createResponse([{ ...scalar, values: { loss: 0.4 } }]));

    await Promise.all([
      fetchScalars("ada", "demo", "run-1"),
      fetchScalars("ada", "demo", "run-2")
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/accounts/ada/projects/demo/runs/run-1/scalars`,
      { credentials: "include" }
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/accounts/ada/projects/demo/runs/run-2/scalars`,
      { credentials: "include" }
    );
    expect(useScalarStore.getState().scalars[buildRunKey("ada", "demo", "run-1")]).toEqual([scalar]);
    expect(useScalarStore.getState().scalars[buildRunKey("ada", "demo", "run-2")]?.[0]?.values["loss"]).toBe(0.4);
    expect(Object.values(useScalarStore.getState().errors).filter(Boolean)).toHaveLength(0);
  });

  it("stores the error when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));
    const runKey = buildRunKey("ada", "demo", "run-1");

    await fetchScalars("ada", "demo", "run-1");

    expect(useScalarStore.getState().errors[runKey]).toBe("Request failed with status 500");
    expect(useScalarStore.getState().isLoading[runKey]).toBe(false);
  });

  it("stores the error when the request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));
    const runKey = buildRunKey("ada", "demo", "run-1");

    await fetchScalars("ada", "demo", "run-1");

    expect(useScalarStore.getState().errors[runKey]).toBe("network error");
    expect(useScalarStore.getState().isLoading[runKey]).toBe(false);
  });

  it("replaces scalars and clears stale errors on success", async () => {
    const existingScalar: Scalar = { ...scalar, step: 0 };
    const runKey = buildRunKey("ada", "demo", "run-1");
    useScalarStore.setState({ scalars: { [runKey]: [existingScalar] }, isLoading: { [runKey]: false }, errors: { [runKey]: "stale error" } });
    fetchMock.mockResolvedValueOnce(createResponse([scalar]));

    await fetchScalars("ada", "demo", "run-1");

    expect(useScalarStore.getState().scalars[runKey]).toEqual([scalar]);
    expect(useScalarStore.getState().errors[runKey]).toBeNull();
  });
});
