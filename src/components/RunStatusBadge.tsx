import type { ReactElement } from "react";

import type { RunStatus } from "types";

interface RunStatusBadgeProps {
  readonly status: RunStatus;
}

const statusClasses: Record<RunStatus, string> = {
  running: "bg-status-running-bg text-status-running-text border border-status-running-border",
  finished: "bg-status-finished-bg text-status-finished-text border border-status-finished-border",
  failed: "bg-status-failed-bg text-status-failed-text border border-status-failed-border",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-text border border-status-cancelled-border",
  inactive: "border border-brand-border bg-white text-brand-textMuted",
};

const formatStatus = (status: RunStatus): string => status.replace(/^\w/, (char) => char.toUpperCase());

export default function RunStatusBadge({ status }: RunStatusBadgeProps): ReactElement {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-medium leading-none ${statusClasses[status]}`}>
      {formatStatus(status)}
    </span>
  );
}
