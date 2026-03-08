import type { User } from "@underfit/types";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

interface NavbarProps {
  readonly user: User | null;
  readonly locationLabel: string;
}

export default function Navbar({ user, locationLabel }: NavbarProps): ReactElement {
  const ownerLabel = user?.handle ?? "workspace";

  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-[#f0f6f7] px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link className="flex items-center gap-3 text-inherit no-underline" to="/">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-accent text-[20px] font-semibold text-white">
            <span className="font-display">U</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold">Underfit</p>
            <p className="mt-0.5 text-xs text-brand-textMuted">Workspace</p>
          </div>
        </Link>

        <div className="hidden h-8 w-px bg-brand-border sm:block" />

        <div className="flex items-center gap-1 text-sm">
          <span className="text-brand-textMuted">{ownerLabel}</span>
          <span className="text-brand-textMuted">/</span>
          <span className="font-semibold">{locationLabel}</span>
        </div>
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d9ecec] font-semibold text-brand-accentStrong">
            {user.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold">{user.displayName}</p>
            <p className="mt-1 text-xs text-brand-textMuted">{user.email}</p>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
