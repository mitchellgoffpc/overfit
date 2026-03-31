import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import SectionHeader from "components/SectionHeader";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import type { ParsedLogLine } from "stores/logs";
import { useLogStore } from "stores/logs";
import { useRunStore } from "stores/runs";

type LogLine = ParsedLogLine & { lineNumber: number };

const workerIds: string[] = ["worker-0", "worker-1"];
const emptyLines: ParsedLogLine[] = [];

export default function RunLogsPage(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const [workerId, setWorkerId] = useState<string>(workerIds[0] ?? "");
  const [search, setSearch] = useState("");
  const scopeKey = `${handle}/${projectName}/${runName}/${workerId}`;
  const scope = useLogStore((state) => state.logsByScope[scopeKey]);
  const fetchLogs = useLogStore((state) => state.fetchLogs);
  const lines = useLogStore((state) => state.logsByScope[scopeKey]?.lines ?? emptyLines);
  const logError = scope?.error ?? null;
  const run = useRunStore((state) => state.runsByKey[`${handle}/${projectName}/${runName}`]);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (!cancelled) { await fetchLogs(handle, projectName, runName, workerId); }
      if (!cancelled) { setTimeout(() => { void poll(); }, 2000); }
    };
    void poll();
    return () => { cancelled = true; };
  }, [fetchLogs, handle, projectName, runName, workerId]);

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
          {workerIds.length > 1 ? (
            <div className="flex items-center">
              <select
                aria-label="Worker"
                className="rounded-xl border border-brand-border bg-white px-3 py-2 text-[0.8125rem] text-brand-text"
                value={workerId}
                onChange={(event) => { setWorkerId(event.target.value); }}
              >
                {workerIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
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
        {logError ? <div className="mb-2 text-[0.8125rem] text-brand-textMuted">{logError}</div> : null}

        <div className="min-h-0 flex-1 overflow-auto border-b border-brand-border">
          {!logError && !scope && visibleLines.length === 0 ? <div className="py-2 text-[0.8125rem] text-brand-textMuted">Loading logs...</div> : null}
          {!logError && scope && visibleLines.length === 0 ? <div className="py-2 text-[0.8125rem] text-brand-textMuted">No logs yet.</div> : null}
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
