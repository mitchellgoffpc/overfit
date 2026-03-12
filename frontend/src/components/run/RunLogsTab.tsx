import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LogReadEntry } from "stores/logs";
import { listRunLogs } from "stores/logs";

interface RunLogsTabProps {
  readonly handle: string;
  readonly projectName: string;
  readonly runName: string;
}

interface LogLine {
  lineNumber: number;
  content: string;
  source: "buffer" | "segment";
}

const workerIds: string[] = ["worker-0", "worker-1"];

const splitLines = (content: string): string[] => {
  if (!content.length) { return []; }
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") { lines.pop(); }
  return lines;
};

const splitTimestampPrefix = (line: string): { timestamp: string | null; message: string } => {
  const match = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(.*)$/.exec(line);
  if (!match) { return { timestamp: null, message: line }; }
  return { timestamp: match[1], message: match[2] };
};

const mergeEntries = (current: LogReadEntry[], incoming: LogReadEntry[]): LogReadEntry[] => {
  if (!incoming.length) { return current; }
  const seen = new Set(current.map((entry) => `${String(entry.startLine)}:${String(entry.endLine)}:${entry.source}`));
  const next = [...current];
  for (const entry of incoming) {
    const key = `${String(entry.startLine)}:${String(entry.endLine)}:${entry.source}`;
    if (!seen.has(key)) {
      seen.add(key);
      next.push(entry);
    }
  }
  return next.sort((a, b) => a.startLine - b.startLine);
};

export default function RunLogsTab({ handle, projectName, runName }: RunLogsTabProps): ReactElement {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workerIds[0]);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<LogReadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef(0);
  const loadingRef = useRef(false);

  const fetchLogs = useCallback(async (reset: boolean) => {
    if (loadingRef.current) { return; }
    loadingRef.current = true;
    if (reset) {
      cursorRef.current = 0;
      setEntries([]);
      setError(null);
    }
    setIsLoading(true);
    const { ok, error: requestError, body } = await listRunLogs(handle, projectName, runName, { workerId: selectedWorkerId, cursor: cursorRef.current, limit: 1000 });
    if (ok) {
      setEntries((prev) => mergeEntries(prev, body.entries));
      cursorRef.current = body.nextCursor;
      setError(null);
    } else if (reset || cursorRef.current === 0) {
      setError(requestError);
    }
    setIsLoading(false);
    loadingRef.current = false;
  }, [handle, projectName, runName, selectedWorkerId]);

  useEffect(() => {
    const start = async () => { await fetchLogs(true); };
    void start();
    const timer = setInterval(() => { void fetchLogs(false); }, 2000);
    return () => { clearInterval(timer); };
  }, [fetchLogs]);

  const lines = useMemo(() => {
    const base = entries.flatMap((entry): LogLine[] =>
      splitLines(entry.content).map((content, index) => ({ lineNumber: entry.startLine + index, content, source: entry.source })));
    if (!search.trim()) { return base; }
    const query = search.trim().toLowerCase();
    return base.filter((line) => line.content.toLowerCase().includes(query));
  }, [entries, search]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-brand-textMuted">Search</span>
          <input className="w-full bg-transparent text-[13px] outline-none" placeholder="Filter log lines" value={search} onChange={(event) => { setSearch(event.target.value); }} />
        </div>
        {workerIds.length > 1 ? (
          <label className="flex items-center gap-2 text-[12px] text-brand-textMuted">
            <span className="uppercase tracking-[0.08em]">Worker</span>
            <select className="rounded-xl border border-brand-border bg-white px-3 py-2 text-[13px] text-brand-text" value={selectedWorkerId} onChange={(event) => { setSelectedWorkerId(event.target.value); }}>
              {workerIds.map((workerId) => (
                <option key={workerId} value={workerId}>
                  {workerId}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? <div className="mb-2 text-[13px] text-brand-textMuted">{error}</div> : null}

      <div className="min-h-0 flex-1 overflow-auto border-y border-brand-border">
        {!error && isLoading && lines.length === 0 ? <div className="px-3 py-2 text-[13px] text-brand-textMuted">Loading logs...</div> : null}
        {!error && !isLoading && lines.length === 0 ? <div className="px-3 py-2 text-[13px] text-brand-textMuted">No logs yet.</div> : null}
        {lines.length > 0 ? (
          <div className="font-mono text-[12px] leading-[20px] text-[#2f3e41]">
            {lines.map((line) => (
              <div className="grid grid-cols-[72px_1fr] items-start gap-3 px-3 py-0.5" key={`${selectedWorkerId}:${String(line.lineNumber)}`}>
                <span className="flex justify-end px-1 pt-[1px] text-right text-brand-textMuted/70">{line.lineNumber}</span>
                <span className={line.source === "buffer" ? "text-brand-accentStrong" : "text-[#2f3e41]"}>
                  {(() => {
                    const { timestamp, message } = splitTimestampPrefix(line.content);
                    if (!timestamp) { return line.content; }
                    return (
                      <>
                        <span className="mr-2 inline-flex items-center whitespace-nowrap rounded bg-[#d6e3e5] px-1.5 text-[#243336]">{timestamp}</span>
                        <span className="break-words">{message}</span>
                      </>
                    );
                  })()}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
