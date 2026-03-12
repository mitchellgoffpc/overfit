import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

import type { ParsedLogLine } from "stores/logs";
import { useLogStore } from "stores/logs";

interface LogsTabProps {
  readonly handle: string;
  readonly projectName: string;
  readonly runName: string;
}

type LogLine = ParsedLogLine & { lineNumber: number };

const workerIds: string[] = ["worker-0", "worker-1"];
const emptyLines: ParsedLogLine[] = [];

export default function LogsTab({ handle, projectName, runName }: LogsTabProps): ReactElement {
  const [workerId, setWorkerId] = useState<string>(workerIds[0]);
  const [search, setSearch] = useState("");
  const scopeKey = `${handle}/${projectName}/${runName}/${workerId}`;
  const scope = useLogStore((state) => state.logsByScope[scopeKey]);
  const fetchLogs = useLogStore((state) => state.fetchLogs);
  const lines = useLogStore((state) => state.logsByScope[scopeKey]?.lines ?? emptyLines);
  const error = scope?.error ?? null;

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
      <div className="grid grid-cols-[72px_1fr] items-start gap-3 px-3 py-0.5" key={line.lineNumber}>
        <span className="flex justify-end px-1 pt-[1px] text-right text-brand-textMuted/70">{line.lineNumber}</span>
        <span className="text-[#2f3e41]">
          {!timestamp ? content : (
            <>
              <span className="mr-2 inline-flex items-center whitespace-nowrap rounded bg-[#d6e3e5] px-1.5 text-[#243336]">{timestamp}</span>
              <span className="break-words">{message}</span>
            </>
          )}
        </span>
      </div>
    );
  };

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
            <select className="rounded-xl border border-brand-border bg-white px-3 py-2 text-[13px] text-brand-text" value={workerId} onChange={(event) => { setWorkerId(event.target.value); }}>
              {workerIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? <div className="mb-2 text-[13px] text-brand-textMuted">{error}</div> : null}

      <div className="min-h-0 flex-1 overflow-auto border-y border-brand-border">
        {!error && !scope && visibleLines.length === 0 ? <div className="px-3 py-2 text-[13px] text-brand-textMuted">Loading logs...</div> : null}
        {!error && scope && visibleLines.length === 0 ? <div className="px-3 py-2 text-[13px] text-brand-textMuted">No logs yet.</div> : null}
        {visibleLines.length > 0 ? (
          <div className="font-mono text-[12px] leading-[20px] text-[#2f3e41]">
            {visibleLines.map(renderLine)}
          </div>
        ) : null}
      </div>
    </section>
  );
}
