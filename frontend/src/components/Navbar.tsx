import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

import { colors } from "colors";
import Avatar from "components/Avatar";
import { useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";

const navButtonClass = "flex items-center gap-3 rounded-full px-2 py-1 ring-offset-2 transition"
  + " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
const menuItemClass = "block px-4 py-2 text-sm text-brand-text hover:bg-hover";

export interface Breadcrumb {
  readonly label: string;
  readonly href?: string;
}

export interface NavbarTab {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon?: IconDefinition;
  readonly tint?: string;
  readonly tintActive?: string;
}

interface NavbarProps {
  readonly breadcrumbs: Breadcrumb[];
  readonly tabs?: NavbarTab[];
  readonly activeTabId?: string;
  readonly tabsMaxWidth?: string;
}

export default function Navbar({
  breadcrumbs,
  tabs = [],
  activeTabId,
  tabsMaxWidth
}: NavbarProps): ReactElement {
  const [, navigate] = useLocation();
  const user = useAccountsStore((state) => state.me());
  const logout = useAuthStore((state) => state.logout);
  const profileHref = user ? `/${user.handle}` : "/";
  const name = user?.name ?? "";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const tabsClass = "flex -mb-px items-end justify-end gap-2";
  const accountMinWidth = tabsMaxWidth ? { minWidth: `calc((100vw - ${tabsMaxWidth}) / 2)` } : undefined;

  const renderTabs = () => (
    <>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const baseClass = "relative inline-flex items-start gap-1.5 rounded-t-[0.625rem] border border-b-0 px-3 py-2.5 text-[0.6875rem]"
          + " font-mono uppercase tracking-[0.08em] no-underline transition-all";
        const sizeClass = isActive ? "h-9" : "h-8 hover:h-9";
        const stateClass = isActive
          ? "z-20 border-nav-tabActive text-brand-text shadow-[0_-4px_10px_rgba(20,45,45,0.08)]"
          : "z-10 border-nav-tabInactive text-brand-textMuted opacity-95 shadow-[0_-4px_10px_rgba(20,45,45,0.08)]"
            + " hover:text-brand-text";
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`${sizeClass} ${baseClass} ${stateClass}`}
            aria-current={isActive ? "page" : undefined}
            style={{ backgroundColor: isActive ? tab.tintActive ?? colors.settingsTab.profile.tintActive : tab.tint ?? colors.settingsTab.profile.tint }}
          >
            {isActive ? (
              <span className="absolute -bottom-1 left-1 right-1 h-1.5 rounded-sm" style={{ background: "rgba(26,123,125,0.24)" }} />
            ) : null}
            {tab.icon ? <FontAwesomeIcon icon={tab.icon} className="h-3 w-3 translate-y-px" /> : null}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <nav className="relative z-30 border-b border-brand-border bg-nav-bg">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6">
        <div className="flex flex-wrap items-center gap-4 py-2.5">
          <Link className="flex items-center gap-3 text-inherit no-underline" href="/">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-accent text-[1.125rem] font-semibold text-white">
              <span className="font-display">U</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Underfit</p>
              <p className="mt-0.5 text-[0.6875rem] leading-tight text-brand-textMuted">Workspace</p>
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

        <div className="ml-auto flex self-stretch items-end gap-3">
          {tabs.length > 0 ? (
            <div className="hidden md:block">
              <div className="mx-auto w-full">
                <div className={tabsClass} aria-label="Project tabs">{renderTabs()}</div>
              </div>
            </div>
          ) : null}

          {user ? (
            <div className="relative flex justify-end py-2.5" ref={menuRef} style={accountMinWidth}>
              <button
                type="button"
                className={navButtonClass}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={() => { setIsMenuOpen((prev) => !prev); }}
              >
                <div className="hidden text-right sm:block">
                  <p className="text-[0.8125rem] font-semibold leading-tight">{name}</p>
                  <p className="mt-1 text-[0.6875rem] leading-tight text-brand-textMuted">{user.email}</p>
                </div>
                <Avatar handle={user.handle} name={name} className="h-9 w-9 text-sm" />
              </button>
              {isMenuOpen ? (
                <div
                  className={"absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-brand-border bg-white py-2"
                    + " shadow-[0_1rem_2rem_rgba(15,23,42,0.14)]"}
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
      </div>

      {tabs.length > 0 ? (
        <div className="px-6 md:hidden">
          <div className="mx-auto w-full">
            <div className={tabsClass} aria-label="Project tabs">{renderTabs()}</div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
