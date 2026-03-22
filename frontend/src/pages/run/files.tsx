import type { ReactElement } from "react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";

import SectionHeader from "components/SectionHeader";
import type { FileEntry } from "stores/files";
import { useFilesStore } from "stores/files";
import { useRunStore } from "stores/runs";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) { return `${String(bytes)} B`; }
  if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (entry: FileEntry): string => {
  if (entry.isDirectory) { return "\uD83D\uDCC1"; }
  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) { return "\uD83D\uDDBC\uFE0F"; }
  if (["json", "jsonl"].includes(ext)) { return "\uD83D\uDCCB"; }
  if (["log", "txt", "csv"].includes(ext)) { return "\uD83D\uDCC4"; }
  if (["yaml", "yml", "toml"].includes(ext)) { return "\u2699\uFE0F"; }
  if (["py", "js", "ts", "sh"].includes(ext)) { return "\uD83D\uDCDC"; }
  return "\uD83D\uDCC4";
};

export default function RunFilesPage(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const run = useRunStore((state) => state.runsByKey[`${handle}/${projectName}/${runName}`]);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const entries = useFilesStore((state) => state.entries);
  const isLoading = useFilesStore((state) => state.isLoading);
  const error = useFilesStore((state) => state.error);
  const fetchFiles = useFilesStore((state) => state.fetchFiles);

  const [location] = useLocation();
  const filesBase = `/${handle}/${projectName}/runs/${runName}/files`;
  const subPath = location.startsWith(filesBase) ? decodeURIComponent(location.slice(filesBase.length + 1)) : "";
  const pathSegments = subPath ? subPath.split("/") : [];

  useEffect(() => {
    void fetchFiles(handle, projectName, runName, subPath || undefined);
  }, [fetchFiles, handle, projectName, runName, subPath]);

  const entryHref = (entry: FileEntry): string => {
    if (!entry.isDirectory) { return location; }
    return subPath ? `${filesBase}/${subPath}/${entry.name}` : `${filesBase}/${entry.name}`;
  };

  return (
    <main className="relative p-[1.5rem]">
      <SectionHeader title="Files" subtitle="run storage" />
      {!run && !isRunsLoading ? (
        <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError ?? "Run not found."}</div>
      ) : null}
      {run && runError ? (
        <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div>
      ) : null}

      {/* Breadcrumb */}
      <div className="mb-1 flex items-center gap-1 px-1 font-mono text-[0.75rem]">
        <Link
          className={"inline-flex items-center gap-1 rounded px-1.5 py-0.5 no-underline transition"
            + (pathSegments.length > 0
              ? " text-[#3d7a68] hover:bg-[#e8f0ed] hover:text-[#2a5c4e]"
              : " text-brand-textMuted")}
          href={filesBase}
        >
          <span className="text-[0.8125rem]">{"\uD83C\uDFE0"}</span>
          <span>root</span>
        </Link>
        {pathSegments.map((segment, i) => (
          <span key={pathSegments.slice(0, i + 1).join("/")} className="flex items-center gap-1">
            <span className="text-brand-textMuted/50">/</span>
            {i < pathSegments.length - 1 ? (
              <Link
                className="rounded px-1.5 py-0.5 no-underline text-[#3d7a68] transition hover:bg-[#e8f0ed] hover:text-[#2a5c4e]"
                href={`${filesBase}/${pathSegments.slice(0, i + 1).join("/")}`}
              >
                {segment}
              </Link>
            ) : (
              <span className="rounded px-1.5 py-0.5 font-medium text-brand-text">{segment}</span>
            )}
          </span>
        ))}
      </div>

      {/* Column headers */}
      <div
        className={"grid h-[1.875rem] grid-cols-[1fr_5.5rem] items-center px-4"
          + " font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted"}
      >
        <span className="pl-7">File name</span>
        <span className="text-right">Size</span>
      </div>

      {/* File listing — one entry per ruled notebook line */}
      {isLoading && entries.length === 0 ? (
        <div className="flex h-[1.875rem] items-center px-4 pl-11 text-[0.8125rem] text-brand-textMuted">
          Loading files...
        </div>
      ) : error ? (
        <div className="flex h-[1.875rem] items-center px-4 pl-11 text-[0.8125rem] text-brand-textMuted">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex h-[1.875rem] items-center px-4 pl-11 text-[0.8125rem] text-brand-textMuted">
          No files found.
        </div>
      ) : (
        entries.map((entry) => {
          const inner = (
            <>
              <span className="flex items-center gap-2 overflow-hidden text-[0.8125rem]">
                <span className="w-5 shrink-0 text-center text-[0.75rem]">{fileIcon(entry)}</span>
                {entry.isDirectory ? (
                  <span className="truncate font-medium text-[#2a5c4e]">{entry.name}/</span>
                ) : (
                  <span className="truncate text-brand-text">{entry.name}</span>
                )}
              </span>
              <span className="text-right font-mono text-[0.6875rem] text-brand-textMuted">
                {entry.isDirectory ? "\u2014" : formatSize(entry.size)}
              </span>
            </>
          );

          return entry.isDirectory ? (
            <Link
              key={entry.name}
              className={"grid h-[1.875rem] grid-cols-[1fr_5.5rem] items-center px-4 no-underline transition-colors"
                + " cursor-pointer hover:bg-[#e8f0ed]/60"}
              href={entryHref(entry)}
            >
              {inner}
            </Link>
          ) : (
            <div
              key={entry.name}
              className="grid h-[1.875rem] grid-cols-[1fr_5.5rem] items-center px-4 transition-colors hover:bg-[#f0f5f3]/60"
            >
              {inner}
            </div>
          );
        })
      )}
    </main>
  );
}
