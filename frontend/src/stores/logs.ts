import type { LogPage } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";

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
  logsByScope: Record<string, LogScope>;
  fetchLogs: (handle: string, projectName: string, runName: string, workerId: string) => Promise<void>;
}

const splitLines = (content: string): string[] => {
  if (!content.length) { return []; }
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") { lines.pop(); }
  return lines;
};

const splitTimestampPrefix = (line: string): ParsedLogLine => {
  const match = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(.*)$/.exec(line);
  if (!match) { return { timestamp: null, message: line }; }
  return { content: line, timestamp: match[1], message: match[2] };
};

export const useLogStore = create<LogState>((set, get) => ({
  logsByScope: {},

  fetchLogs: async (handle: string, projectName: string, runName: string, workerId: string) => {
    const scopeKey = `${handle}/${projectName}/${runName}/${workerId}`;
    const requestedCursor = get().logsByScope[scopeKey]?.cursor ?? 0;

    const query = new URLSearchParams({ workerId, cursor: String(requestedCursor) });
    const { ok, body, error } = await request<LogPage>(`accounts/${handle}/projects/${projectName}/runs/${runName}/logs?${query.toString()}`);
    const scope = get().logsByScope[scopeKey] ?? { lines: [], cursor: 0, error: null };
    if (ok) {
      if (scope.cursor === requestedCursor) {
        const incomingLines = body.entries.flatMap((entry) => splitLines(entry.content).map(splitTimestampPrefix));
        const newScope = { lines: [...scope.lines, ...incomingLines], cursor: body.nextCursor, error: null };
        set((state) => ({ logsByScope: { ...state.logsByScope, [scopeKey]: newScope } }));
        if (body.hasMore && body.nextCursor > requestedCursor) {
          await get().fetchLogs(handle, projectName, runName, workerId);
        }
      }
    } else if (scope.cursor === requestedCursor) {
      set((state) => ({ logsByScope: { ...state.logsByScope, [scopeKey]: { ...scope, error } } }));
    };
  }
}));
