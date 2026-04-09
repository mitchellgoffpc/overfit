import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchLogs, useLogStore } from "stores/logs";
import { API_BASE } from "types";

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("log store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useLogStore.setState({ logs: {} });
    vi.restoreAllMocks();
  });

  it("fetches logs for a worker and parses lines", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({
      entries: [{ content: "2025-01-01T00:00:00Z started\nplain message\n" }],
      nextCursor: 2,
      hasMore: false
    }));

    await fetchLogs("ada", "demo", "run-1", "worker-1");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/accounts/ada/projects/demo/runs/run-1/logs?workerLabel=worker-1&cursor=0`,
      { credentials: "include" }
    );
    expect(useLogStore.getState().logs["ada/demo/run-1/worker-1"]).toMatchObject({
      cursor: 2,
      error: null,
      lines: [
        { timestamp: "2025-01-01T00:00:00Z", message: "started" },
        { timestamp: null, message: "plain message" }
      ]
    });
  });

  it("recursively fetches more pages when hasMore is true", async () => {
    fetchMock
      .mockResolvedValueOnce(createResponse({
        entries: [{ content: "2025-01-01T00:00:00Z first\n" }],
        nextCursor: 1,
        hasMore: true
      }))
      .mockResolvedValueOnce(createResponse({
        entries: [{ content: "2025-01-01T00:00:01Z second\n" }],
        nextCursor: 2,
        hasMore: false
      }));

    await fetchLogs("ada", "demo", "run-1", "worker-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_BASE}/accounts/ada/projects/demo/runs/run-1/logs?workerLabel=worker-1&cursor=0`,
      { credentials: "include" }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_BASE}/accounts/ada/projects/demo/runs/run-1/logs?workerLabel=worker-1&cursor=1`,
      { credentials: "include" }
    );
    expect(useLogStore.getState().logs["ada/demo/run-1/worker-1"]).toMatchObject({
      cursor: 2,
      error: null,
      lines: [
        { timestamp: "2025-01-01T00:00:00Z", message: "first" },
        { timestamp: "2025-01-01T00:00:01Z", message: "second" }
      ]
    });
  });

  it("stores request errors on the scope", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    await fetchLogs("ada", "demo", "run-1", "worker-1");

    expect(useLogStore.getState().logs["ada/demo/run-1/worker-1"]).toEqual({
      lines: [],
      cursor: 0,
      error: "Request failed with status 500"
    });
  });

  it("appends new lines to existing logs for the same scope", async () => {
    useLogStore.setState({
      logs: {
        "ada/demo/run-1/worker-1": {
          lines: [{ content: "existing", timestamp: null, message: "existing" }],
          cursor: 1,
          error: "stale"
        }
      }
    });
    fetchMock.mockResolvedValueOnce(createResponse({
      entries: [{ content: "2025-01-01T00:00:02Z next\n" }],
      nextCursor: 2,
      hasMore: false
    }));

    await fetchLogs("ada", "demo", "run-1", "worker-1");

    expect(useLogStore.getState().logs["ada/demo/run-1/worker-1"]).toMatchObject({
      cursor: 2,
      error: null,
      lines: [
        { timestamp: null, message: "existing" },
        { timestamp: "2025-01-01T00:00:02Z", message: "next" }
      ]
    });
  });

  it("ignores success responses when cursor changes before completion", async () => {
    let resolveFetch!: (value: ReturnType<typeof createResponse>) => void;
    fetchMock.mockReturnValueOnce(new Promise<ReturnType<typeof createResponse>>((resolve) => {
      resolveFetch = resolve;
    }));

    const fetchPromise = fetchLogs("ada", "demo", "run-1", "worker-1");
    useLogStore.setState({
      logs: {
        "ada/demo/run-1/worker-1": { lines: [{ content: "stale", timestamp: null, message: "stale" }], cursor: 9, error: null }
      }
    });
    resolveFetch(createResponse({ entries: [{ content: "2025-01-01T00:00:00Z ignored\n" }], nextCursor: 1, hasMore: false }));
    await fetchPromise;

    expect(useLogStore.getState().logs["ada/demo/run-1/worker-1"]).toEqual({
      lines: [{ content: "stale", timestamp: null, message: "stale" }],
      cursor: 9,
      error: null
    });
  });

  it("ignores error responses when cursor changes before completion", async () => {
    let resolveFetch!: (value: ReturnType<typeof createResponse>) => void;
    fetchMock.mockReturnValueOnce(new Promise<ReturnType<typeof createResponse>>((resolve) => {
      resolveFetch = resolve;
    }));

    const fetchPromise = fetchLogs("ada", "demo", "run-1", "worker-1");
    useLogStore.setState({
      logs: {
        "ada/demo/run-1/worker-1": { lines: [], cursor: 3, error: null }
      }
    });
    resolveFetch(createResponse({ error: "late failure" }, { ok: false, status: 500 }));
    await fetchPromise;

    expect(useLogStore.getState().logs["ada/demo/run-1/worker-1"]).toEqual({ lines: [], cursor: 3, error: null });
  });
});
