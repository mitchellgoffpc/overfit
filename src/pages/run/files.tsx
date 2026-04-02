import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faDownload, faFile, faFileCode, faFileImage, faFileLines, faFolder, faGear } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";

import SectionHeader from "components/SectionHeader";
import { formatRunTime, RULED_LINE } from "helpers";
import type { FileEntry } from "stores/files";
import { fetchFiles, useFilesStore } from "stores/files";
import { buildRunKey, useRunStore } from "stores/runs";
import { API_BASE } from "types";

const statusClass = "flex items-center px-[1.5rem] pl-[calc(1.5rem+1.75rem)] text-[0.8125rem] text-brand-textMuted";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) { return `${String(bytes)} B`; }
  if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (entry: FileEntry): IconDefinition => {
  if (entry.isDirectory) { return faFolder; }
  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) { return faFileImage; }
  if (["json", "jsonl"].includes(ext)) { return faFileLines; }
  if (["log", "txt", "csv"].includes(ext)) { return faFileLines; }
  if (["yaml", "yml", "toml"].includes(ext)) { return faGear; }
  if (["py", "js", "ts", "sh"].includes(ext)) { return faFileCode; }
  return faFile;
};

const EMPTY_ENTRIES: FileEntry[] = [];

export default function RunFilesPage(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const runKey = buildRunKey(handle, projectName, runName);
  const run = useRunStore((state) => state.runs[runKey]);
  const runError = useRunStore((state) => state.errors[runKey] ?? null);
  const isRunsLoading = useRunStore((state) => state.isLoading[runKey] ?? false);
  const [location] = useLocation();
  const filesBase = `/${handle}/${projectName}/runs/${runName}/files`;
  const subPath = location.startsWith(filesBase) ? decodeURIComponent(location.slice(filesBase.length + 1)) : "";
  const scopeKey = `${runKey}/${subPath}`;
  const entries = useFilesStore((state) => state.entries[scopeKey] ?? EMPTY_ENTRIES);
  const isLoading = useFilesStore((state) => state.isLoading[scopeKey] ?? false);
  const fileError = useFilesStore((state) => state.errors[scopeKey] ?? null);
  const pathSegments = subPath.split("/").filter((segment) => segment.length > 0);
  const breadcrumbs = [{ label: "root", href: filesBase }, ...pathSegments.map((segment, index) => ({
    label: segment,
    href: `${filesBase}/${pathSegments.slice(0, index + 1).map((part) => encodeURIComponent(part)).join("/")}`
  }))];

  useEffect(() => {
    void fetchFiles(handle, projectName, runName, subPath || undefined);
  }, [handle, projectName, runName, subPath]);

  const entryHref = (entry: FileEntry): string => {
    if (!entry.isDirectory) { return location; }
    return subPath ? `${filesBase}/${subPath}/${entry.name}` : `${filesBase}/${entry.name}`;
  };

  return (
    <main className="relative pb-[1.5rem] px-4 lg:px-[1.5rem]">
      <SectionHeader title="Files" subtitle="run storage" sectionLabel="Section D" />
      <nav
        aria-label="Current files path"
        className="flex items-center gap-2 text-[0.75rem] text-brand-textMuted"
        style={{ height: RULED_LINE, lineHeight: RULED_LINE }}
      >
        <FontAwesomeIcon icon={faFolder} className="shrink-0 text-[0.75rem] text-brand-textMuted/80" />
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div className="flex shrink-0 items-center gap-1" key={crumb.href}>
                {isLast ? (
                  <span className="font-medium text-brand-text">{crumb.label}</span>
                ) : (
                  <Link className="text-brand-textMuted no-underline hover:text-brand-text" href={crumb.href}>{crumb.label}</Link>
                )}
                {!isLast ? <span className="text-brand-textMuted/70">/</span> : null}
              </div>
            );
          })}
        </div>
      </nav>
      {!run && !isRunsLoading ? (
        <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError ?? "Run not found."}</div>
      ) : null}
      {run && runError ? (
        <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div>
      ) : null}

      <div style={{ marginTop: RULED_LINE }}>
        {/* Column headers */}
        <div
          className={"grid grid-cols-[1fr_9rem_5.5rem_3.5rem] items-center bg-file-rowHover/60 -ml-[calc(1rem-1px)] -mr-4 pl-4 pr-4"
            + " font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted lg:-mx-6 lg:px-6"}
          style={{ height: `calc(${RULED_LINE} - 1px)` }}
        >
          <span className="lg:pl-6">File name</span>
          <span className="text-right">Modified</span>
          <span className="text-right">Size</span>
          <span />
        </div>

        {/* File listing — one entry per ruled notebook line */}
        <div className="-mx-[1.5rem]">
          {isLoading && entries.length === 0 ? (
            <div className={statusClass} style={{ height: RULED_LINE }}>Loading files...</div>
          ) : fileError ? (
            <div className={statusClass} style={{ height: RULED_LINE }}>{fileError}</div>
          ) : entries.length === 0 ? (
            <div className={statusClass} style={{ height: RULED_LINE }}>No files found.</div>
          ) : (
            entries.map((entry) => {
              const filePath = subPath ? `${subPath}/${entry.name}` : entry.name;
              const downloadUrl = `${API_BASE}/accounts/${handle}/projects/${projectName}/runs/${runName}/files/download?path=${encodeURIComponent(filePath)}`;
              const inner = (
                <>
                  <span className="flex items-center gap-2 overflow-hidden text-[0.8125rem]">
                    <FontAwesomeIcon icon={fileIcon(entry)} className="w-4 shrink-0 text-[0.75rem] text-brand-textMuted" />
                    {entry.isDirectory ? (
                      <span className="truncate font-medium text-file-folder">{entry.name}/</span>
                    ) : (
                      <span className="truncate text-brand-text">{entry.name}</span>
                    )}
                  </span>
                  <span className="text-right text-[0.8125rem] text-brand-textMuted">
                    {formatRunTime(entry.lastModified)}
                  </span>
                  <span className="text-right font-mono text-[0.8125rem] text-brand-textMuted">
                    {entry.isDirectory ? "\u2014" : formatSize(entry.size)}
                  </span>
                  <span className="flex justify-center">
                    {entry.isDirectory ? null : (
                      <a
                        href={downloadUrl}
                        className={"flex h-6 w-6 items-center justify-center rounded text-brand-textMuted"
                          + " transition-colors hover:bg-brand-border/60 hover:text-brand-text"}
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <FontAwesomeIcon icon={faDownload} className="text-[0.75rem]" />
                      </a>
                    )}
                  </span>
                </>
              );

              return entry.isDirectory ? (
                <Link
                  key={entry.name}
                  className={"grid grid-cols-[1fr_9rem_5.5rem_3.5rem] items-center px-[1.5rem] no-underline transition-colors"
                    + " cursor-pointer hover:bg-hover/60"}
                  style={{ height: RULED_LINE }}
                  href={entryHref(entry)}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={entry.name}
                  className="grid grid-cols-[1fr_9rem_5.5rem_3.5rem] items-center px-[1.5rem] transition-colors hover:bg-file-rowHover/60"
                  style={{ height: RULED_LINE }}
                >
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
