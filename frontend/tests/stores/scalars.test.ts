import { API_VERSION } from "@underfit/types";
import type { Scalar } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScalarStore } from "stores/scalars";

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

const scalar: Scalar = {
  id: "scalar-1",
  runId: "run-1",
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
    useScalarStore.setState({ scalars: [], isLoading: false, error: null });
    vi.restoreAllMocks();
  });

  it("fetches scalars with cookie credentials", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([scalar]));

    await useScalarStore.getState().fetchScalars("ada", "demo", "run-1");

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBase}/accounts/ada/projects/demo/runs/run-1/scalars`,
      { credentials: "include" }
    );
    expect(useScalarStore.getState().scalars).toEqual([scalar]);
    expect(useScalarStore.getState().isLoading).toBe(false);
    expect(useScalarStore.getState().error).toBeNull();
  });

  it("stores the error when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    await useScalarStore.getState().fetchScalars("ada", "demo", "run-1");

    expect(useScalarStore.getState().error).toBe("Request failed with status 500");
    expect(useScalarStore.getState().isLoading).toBe(false);
  });

  it("stores the error when the request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    await useScalarStore.getState().fetchScalars("ada", "demo", "run-1");

    expect(useScalarStore.getState().error).toBe("network error");
    expect(useScalarStore.getState().isLoading).toBe(false);
  });

  it("replaces scalars and clears stale errors on success", async () => {
    const existingScalar: Scalar = { ...scalar, id: "scalar-2", step: 0 };
    useScalarStore.setState({ scalars: [existingScalar], isLoading: false, error: "stale error" });
    fetchMock.mockResolvedValueOnce(createResponse([scalar]));

    await useScalarStore.getState().fetchScalars("ada", "demo", "run-1");

    expect(useScalarStore.getState().scalars).toEqual([scalar]);
    expect(useScalarStore.getState().error).toBeNull();
  });
});
