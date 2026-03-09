import type { Run } from "@underfit/types";
import type { ReactElement } from "react";

interface RunStatusBadgeProps {
  readonly status: Run["status"];
}

const statusClasses: Record<Run["status"], string> = {
  queued: "bg-[#f8eee0] text-[#8c5a1a] border border-[#e9d7bf]",
  running: "bg-[#e3f3f2] text-brand-accentStrong border border-[#cbe2e1]",
  finished: "bg-[#e6f3ea] text-[#1e5b36] border border-[#cfe6d7]",
  failed: "bg-[#fde8e6] text-[#b42318] border border-[#f7c8c2]",
  canceled: "bg-[#eef1f3] text-[#4a5560] border border-[#d7dde2]",
};

const formatStatus = (status: Run["status"]): string => status.replace(/^\w/, (char) => char.toUpperCase());

export default function RunStatusBadge({ status }: RunStatusBadgeProps): ReactElement {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${statusClasses[status]}`}>
      {formatStatus(status)}
    </span>
  );
}
