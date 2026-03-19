import type { ReactElement } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

import { apiBase } from "helpers";
import { useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";

const navButtonClass = "flex items-center gap-3 rounded-full px-2 py-1 ring-offset-2 transition"
  + " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
const menuItemClass = "block px-4 py-2 text-sm text-brand-text hover:bg-[#f3f7f7]";

export interface Breadcrumb {
  readonly label: string;
  readonly href?: string;
}

export interface NavbarTab {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

interface NavbarProps {
  readonly breadcrumbs: Breadcrumb[];
  readonly tabs?: NavbarTab[];
  readonly activeTabId?: string;
}

export default function Navbar({ breadcrumbs, tabs = [], activeTabId }: NavbarProps): ReactElement {
  const [, navigate] = useLocation();
  const user = useAccountsStore((state) => state.me());
  const logout = useAuthStore((state) => state.logout);
  const profileHref = user ? `/${user.handle}` : "/";
  const name = user?.name ?? "";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarSrc = user ? `${apiBase}/users/${encodeURIComponent(user.handle)}/avatar` : "";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
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

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <nav className="border-b border-brand-border bg-[#f0f6f7]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <Link className="flex items-center gap-3 text-inherit no-underline" href="/">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-accent text-[18px] font-semibold text-white">
              <span className="font-display">U</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Underfit</p>
              <p className="mt-0.5 text-[11px] leading-tight text-brand-textMuted">Workspace</p>
            </div>
          </Link>

          {breadcrumbs.length > 0 ? (
            <>
              <div className="hidden h-7 w-px bg-brand-border sm:block" />
              <div className="flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <Fragment key={crumb.label}>
                      {i > 0 ? <span className="text-brand-textMuted">/</span> : null}
                      {isLast ? (
                        <span className="font-semibold">{crumb.label}</span>
                      ) : crumb.href ? (
                        <Link className="text-brand-textMuted no-underline transition hover:text-brand-text" href={crumb.href}>
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-brand-textMuted">{crumb.label}</span>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className={navButtonClass}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => { setIsMenuOpen((prev) => !prev); }}
            >
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-semibold leading-tight">{name}</p>
                <p className="mt-1 text-[11px] leading-tight text-brand-textMuted">{user.email}</p>
              </div>
              <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#d9ecec] text-sm font-semibold text-brand-accentStrong">
                {initials}
                <img
                  key={user.handle}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={avatarSrc}
                  alt={`${name} avatar`}
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              </div>
            </button>
            {isMenuOpen ? (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-brand-border bg-white py-2 shadow-[0_16px_32px_rgba(15,23,42,0.14)]"
                role="menu"
              >
                <Link className={menuItemClass} role="menuitem" href={profileHref}>
                  Profile
                </Link>
                <Link className={menuItemClass} role="menuitem" href="/">
                  Projects
                </Link>
                <Link className={menuItemClass} role="menuitem" href={profileHref}>
                  Runs
                </Link>
                <Link className={menuItemClass} role="menuitem" href="/settings/profile">
                  Settings
                </Link>
                <div className="my-2 border-t border-brand-border" />
                <button
                  type="button"
                  className={`w-full text-left ${menuItemClass}`}
                  role="menuitem"
                  onClick={() => { void handleLogout(); }}
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {tabs.length > 0 ? (
        <div className="px-6">
          <div className="flex items-center gap-7 overflow-x-auto" aria-label="Project tabs">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={[
                    "relative -mb-px inline-flex h-9 items-center border-b-2 px-0 text-[15px] font-medium no-underline transition-colors",
                    isActive ? "border-[#1a7b7d] text-brand-text" : "border-transparent text-brand-textMuted hover:text-brand-text"
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
