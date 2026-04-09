import { create } from "zustand";

import { request } from "helpers";
import type { LogPage } from "types";

export interface ParsedLogLine {
  content: string;
  timestamp: string | null;
  message: string;
}

interface LogScope {
  lines: ParsedLogLine[];
  cursor: number;
  error: string | null;
}

interface LogState {
  logs: Record<string, LogScope>;
}

export const useLogStore = create<LogState>(() => ({
  logs: {}
}));

const splitLines = (content: string): string[] => {
  if (!content.length) { return []; }
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") { lines.pop(); }
  return lines;
};

const splitTimestampPrefix = (line: string): ParsedLogLine => {
  const match = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(.*)$/.exec(line);
  if (!match) { return { content: line, timestamp: null, message: line }; }
  return { content: line, timestamp: match[1] ?? null, message: match[2] ?? line };
};

export const fetchLogs = async (handle: string, projectName: string, runName: string, workerLabel: string): Promise<void> => {
  const scopeKey = `${handle}/${projectName}/${runName}/${workerLabel}`;
  const requestedCursor = useLogStore.getState().logs[scopeKey]?.cursor ?? 0;

  const query = new URLSearchParams({ workerLabel, cursor: String(requestedCursor) });
  const { ok, body, error } = await request<LogPage>(`accounts/${handle}/projects/${projectName}/runs/${runName}/logs?${query.toString()}`);
  const scope = useLogStore.getState().logs[scopeKey] ?? { lines: [], cursor: 0, error: null };
  if (ok) {
    if (scope.cursor === requestedCursor) {
      const incomingLines = body.entries.flatMap((entry) => splitLines(entry.content).map(splitTimestampPrefix));
      const newScope = { lines: [...scope.lines, ...incomingLines], cursor: body.nextCursor, error: null };
      useLogStore.setState((state) => ({ logs: { ...state.logs, [scopeKey]: newScope } }));
      if (body.hasMore && body.nextCursor > requestedCursor) {
        await fetchLogs(handle, projectName, runName, workerLabel);
      }
    }
  } else if (scope.cursor === requestedCursor) {
    useLogStore.setState((state) => ({ logs: { ...state.logs, [scopeKey]: { ...scope, error } } }));
  }
};
