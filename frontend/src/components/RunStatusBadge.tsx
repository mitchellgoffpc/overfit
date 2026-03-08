import type { Run } from "@underfit/types";
import type { ReactElement } from "react";

interface RunStatusBadgeProps {
  readonly status: Run["status"];
}

const statusClasses: Record<Run["status"], string> = {
  queued: "bg-[#f7e9d5] text-[#9a5c0b]",
  running: "bg-[#dff0f0] text-brand-accentStrong",
  finished: "bg-[#e1f2e7] text-[#1f6b3f]",
  failed: "bg-[#fee4e2] text-[#b42318]",
  canceled: "bg-[#eceff1] text-[#4a5560]",
};

const formatStatus = (status: Run["status"]): string => status.replace(/^\w/, (char) => char.toUpperCase());

export default function RunStatusBadge({ status }: RunStatusBadgeProps): ReactElement {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}>
      {formatStatus(status)}
    </span>
  );
}
