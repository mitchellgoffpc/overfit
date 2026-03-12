import { request } from "helpers";

export interface LogReadEntry {
  startLine: number;
  endLine: number;
  content: string;
  startAt: string;
  endAt: string;
  source: "buffer" | "segment";
}

export interface ListRunLogsResponse {
  entries: LogReadEntry[];
  nextCursor: number;
  hasMore: boolean;
}
type ListRunLogsResult = ({ ok: true; body: ListRunLogsResponse } | { ok: false; error: string }) & { status: number | null };

interface ListRunLogsOptions {
  workerId: string;
  cursor?: number;
  limit?: number;
}

export const listRunLogs = async (
  handle: string,
  projectName: string,
  runName: string,
  options: ListRunLogsOptions,
): Promise<ListRunLogsResult> => {
  const query = new URLSearchParams({ workerId: options.workerId });
  if (options.cursor !== undefined) { query.set("cursor", String(options.cursor)); }
  if (options.limit !== undefined) { query.set("limit", String(options.limit)); }
  return await request<ListRunLogsResponse>(`accounts/${handle}/projects/${projectName}/runs/${runName}/logs?${query.toString()}`);
};
