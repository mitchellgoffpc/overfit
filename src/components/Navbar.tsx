import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { Fragment, useState } from "react";
import { Link, useLocation } from "wouter";

import Avatar from "components/Avatar";
import DropdownMenu from "components/DropdownMenu";
import { getMe, useAccountsStore } from "stores/accounts";
import { logout } from "stores/auth";

const navButtonClass = "flex items-center gap-3 rounded-full px-2 py-1 ring-offset-2 transition"
  + " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";

export interface Breadcrumb {
  readonly label: string;
  readonly href?: string;
}

export interface NavbarTab {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon?: IconDefinition;
}

interface NavbarProps {
  readonly breadcrumbs: Breadcrumb[];
  readonly tabs?: NavbarTab[];
  readonly activeTabId?: string;
  readonly pageWidth?: string;
}

export default function Navbar({
  breadcrumbs,
  tabs = [],
  activeTabId,
  pageWidth
}: NavbarProps): ReactElement {
  const [, navigate] = useLocation();
  const user = useAccountsStore(getMe);
  const profileHref = user ? `/${user.handle}` : "/";
  const name = user?.name ?? "";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const tabsClass = "flex -mb-px items-end justify-end gap-2";
  const accountMinWidth = pageWidth ? { minWidth: `calc((100vw - ${pageWidth}) / 2)` } : undefined;

  const renderTabs = () => (
    <div className={tabsClass} aria-label="Project tabs">
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
            style={{ backgroundColor: isActive ? "#fcfffd" : "#f6fbf8" }}
          >
            {isActive ? (
              <span className="absolute -bottom-1 left-1 right-1 h-1.5 rounded-sm" style={{ background: "rgba(26,123,125,0.24)" }} />
            ) : null}
            {tab.icon ? <FontAwesomeIcon icon={tab.icon} className="h-3 w-3 translate-y-px" /> : null}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <nav className="relative z-30 border-b border-brand-border bg-nav-bg">
      <div className="flex flex-wrap items-center gap-3 px-6 md:flex-nowrap">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 py-2.5 md:flex-nowrap">
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
              <div className="min-w-0 flex-1 truncate text-sm">
                {breadcrumbs.map((crumb, i) => (
                  <Fragment key={crumb.label}>
                    {i > 0 ? <span className="mx-1 text-brand-textMuted">/</span> : null}
                    {i === breadcrumbs.length - 1 ? (
                      <span className="font-semibold">{crumb.label}</span>
                    ) : crumb.href ? (
                      <Link className="text-brand-textMuted no-underline transition hover:text-brand-text" href={crumb.href}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-brand-textMuted">{crumb.label}</span>
                    )}
                  </Fragment>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 self-stretch items-end gap-3">
          {tabs.length > 0 ? (
            <div className="hidden sm:block">{renderTabs()}</div>
          ) : null}

          {user ? (
            <DropdownMenu
              open={isMenuOpen}
              onOpenChange={setIsMenuOpen}
              className="relative flex justify-end py-2.5"
              style={accountMinWidth}
              sections={[
                { items: [
                  { label: "Profile", href: profileHref },
                  { label: "Projects", href: "/" },
                  { label: "Runs", href: profileHref },
                  { label: "Settings", href: "/settings/profile" }
                ] },
                { items: [{ label: "Sign Out", onSelect: handleLogout }] }
              ]}
              trigger={(
                <button
                  type="button"
                  className={navButtonClass}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  onClick={() => { setIsMenuOpen((prev) => !prev); }}
                >
                  <div className="hidden text-right xl:block">
                    <p className="text-[0.8125rem] font-semibold leading-tight">{name}</p>
                    <p className="mt-1 text-[0.6875rem] leading-tight text-brand-textMuted">{user.email}</p>
                  </div>
                  <Avatar handle={user.handle} name={name} className="h-9 w-9 text-sm" />
                </button>
              )}
            />
          ) : null}
        </div>
      </div>

      {tabs.length > 0 ? (
        <div className="px-6 sm:hidden">
          <div className="mx-auto w-full">{renderTabs()}</div>
        </div>
      ) : null}
    </nav>
  );
}
