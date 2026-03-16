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
      <div className="w-full max-w-sm rounded-[18px] border border-brand-border bg-brand-surface p-6 shadow-lg" onClick={(e) => { e.stopPropagation(); }}>
        {children}
      </div>
    </div>
  );
}
