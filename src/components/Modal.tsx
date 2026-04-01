import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps): ReactElement | null {
  useEffect(() => {
    if (!open) { return; }
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { onClose(); } };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); };
  }, [open, onClose]);

  if (!open) { return null; }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-[1.125rem] border border-brand-border bg-brand-surface p-6 shadow-lg"
        onClick={(e) => { e.stopPropagation(); }}
      >
        <button
          type="button"
          aria-label="Close modal"
          className={
            "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none"
            + " text-brand-textMuted transition-colors hover:bg-black/10 hover:text-brand-text"
          }
          onClick={onClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>
        {children}
      </div>
    </div>
  );
}
