import type { User } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface NavbarProps {
  readonly user: User | null;
  readonly locationLabel: string;
}

export default function Navbar({ user, locationLabel }: NavbarProps): ReactElement {
  const ownerLabel = user?.handle ?? "workspace";
  const displayName = user?.name ?? user?.displayName ?? "";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (event.target instanceof Node && menuRef.current.contains(event.target)) {
        return;
      }

      setIsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="flex items-center gap-3 rounded-full px-2 py-1 ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => {
              setIsMenuOpen((prev) => !prev);
            }}
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="mt-1 text-xs text-brand-textMuted">{user.email}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d9ecec] font-semibold text-brand-accentStrong">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          </button>
          {isMenuOpen ? (
            <div
              className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-brand-border bg-white py-2 shadow-[0_16px_32px_rgba(15,23,42,0.14)]"
              role="menu"
            >
              <Link className="block px-4 py-2 text-sm text-brand-text hover:bg-[#f3f7f7]" role="menuitem" to="/profile">
                Profile
              </Link>
              <Link className="block px-4 py-2 text-sm text-brand-text hover:bg-[#f3f7f7]" role="menuitem" to="/">
                Projects
              </Link>
              <Link className="block px-4 py-2 text-sm text-brand-text hover:bg-[#f3f7f7]" role="menuitem" to="/profile">
                Runs
              </Link>
              <Link className="block px-4 py-2 text-sm text-brand-text hover:bg-[#f3f7f7]" role="menuitem" to="/settings/profile">
                Settings
              </Link>
              <div className="my-2 border-t border-brand-border" />
              <Link className="block px-4 py-2 text-sm text-brand-text hover:bg-[#f3f7f7]" role="menuitem" to="/login">
                Sign Out
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
