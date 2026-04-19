import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import SectionHeader from "components/SectionHeader";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import type { ParsedLogLine } from "stores/logs";
import { fetchLogs, useLogStore } from "stores/logs";
import { buildRunKey, useRunStore } from "stores/runs";
import { fetchWorkers, useWorkerStore } from "stores/workers";
import type { Worker } from "types";

type LogLine = ParsedLogLine & { lineNumber: number };

const emptyLines: ParsedLogLine[] = [];
const emptyWorkers: Worker[] = [];

export default function RunLogsPage(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const runKey = buildRunKey(handle, projectName, runName);
  const workers = useWorkerStore((state) => state.workers[runKey] ?? emptyWorkers);
  const isWorkersLoading = useWorkerStore((state) => state.isLoading[runKey] ?? false);
  const workerError = useWorkerStore((state) => state.errors[runKey] ?? null);
  const [workerLabel, setWorkerLabel] = useState("");
  const [search, setSearch] = useState("");
  const selectedWorkerLabel = workers.some((worker) => worker.workerLabel === workerLabel) ? workerLabel : workers[0]?.workerLabel ?? "";
  const scopeKey = `${handle}/${projectName}/${runName}/${selectedWorkerLabel}`;
  const scope = useLogStore((state) => state.logs[scopeKey]);
  const lines = useLogStore((state) => state.logs[scopeKey]?.lines ?? emptyLines);
  const logError = scope?.error ?? null;
  const run = useRunStore((state) => state.runs[runKey]);
  const runError = useRunStore((state) => state.errors[runKey] ?? null);
  const isRunsLoading = useRunStore((state) => state.isLoading[runKey] ?? false);

  useEffect(() => {
    void fetchWorkers(handle, projectName, runName);
  }, [handle, projectName, runName]);

  useEffect(() => {
    if (!selectedWorkerLabel) { return; }
    let cancelled = false;
    const poll = async () => {
      if (!cancelled) { await fetchLogs(handle, projectName, runName, selectedWorkerLabel); }
      if (!cancelled) { setTimeout(() => { void poll(); }, 2000); }
    };
    void poll();
    return () => { cancelled = true; };
  }, [handle, projectName, runName, selectedWorkerLabel]);

  const visibleLines = useMemo(() => {
    const base = lines.map((line, index): LogLine => ({ lineNumber: index, ...line }));
    if (!search.trim()) { return base; }
    const query = search.trim().toLowerCase();
    return base.filter((line) => line.content.toLowerCase().includes(query));
  }, [lines, search]);

  const renderLine = (line: LogLine) => {
    const { timestamp, message, content } = line;
    return (
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3" style={{ minHeight: RULED_LINE }} key={line.lineNumber}>
        <span className="flex justify-end px-1 text-right text-brand-textMuted/70">{line.lineNumber}</span>
        <span className="min-w-0 whitespace-normal text-log-text">
          {!timestamp ? content : (
            <>
              <span className="mr-2 inline-flex items-center whitespace-nowrap rounded bg-log-badge px-1.5 leading-5 text-log-textMuted">{timestamp}</span>
              <span>{message}</span>
            </>
          )}
        </span>
      </div>
    );
  };

  return (
    <main className="relative flex min-h-[32.5rem] flex-col pb-[1.5rem] px-4 lg:px-[1.5rem]">
      <SectionHeader title="Logs" subtitle="live stream + search" sectionLabel="Section C" />
      <section
        className="flex items-center gap-2"
        style={{ height: `${String(RULED_LINE_HEIGHT * 3)}rem` }}
      >
        <div className="flex flex-1 items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2">
            <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-brand-textMuted">Search</span>
            <input
              className="w-full bg-transparent text-[0.8125rem] outline-none"
              placeholder="Filter log lines"
              value={search}
              onChange={(event) => { setSearch(event.target.value); }}
            />
          </div>
          {workers.length > 1 ? (
            <div className="flex items-center">
              <select
                aria-label="Worker"
                className="rounded-xl border border-brand-border bg-white px-3 py-2 text-[0.8125rem] text-brand-text"
                value={selectedWorkerLabel}
                onChange={(event) => { setWorkerLabel(event.target.value); }}
              >
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.workerLabel}>
                    {worker.workerLabel}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError ?? "Run not found."}</div> : null}
      {run && runError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div> : null}

      <section className="flex min-h-0 flex-1 flex-col">
        {workerError ? <div className="mb-2 text-[0.8125rem] text-brand-textMuted">{workerError}</div> : null}
        {logError ? <div className="mb-2 text-[0.8125rem] text-brand-textMuted">{logError}</div> : null}

        <div className="min-h-0 flex-1 overflow-auto border-b border-brand-border">
          {!workerError && isWorkersLoading ? <div className="py-2 text-[0.8125rem] text-brand-textMuted">Loading workers...</div> : null}
          {!workerError && !isWorkersLoading && workers.length === 0 ? <div className="py-2 text-[0.8125rem] text-brand-textMuted">No workers yet.</div> : null}
          {!workerError && workers.length > 0 && !logError && !scope && visibleLines.length === 0
            ? <div className="py-2 text-[0.8125rem] text-brand-textMuted">Loading logs...</div>
            : null}
          {!workerError && workers.length > 0 && !logError && scope && visibleLines.length === 0
            ? <div className="py-2 text-[0.8125rem] text-brand-textMuted">No logs yet.</div>
            : null}
          {visibleLines.length > 0 ? (
            <div className="font-mono text-[0.75rem] text-log-text" style={{ lineHeight: RULED_LINE }}>
              {visibleLines.map(renderLine)}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
