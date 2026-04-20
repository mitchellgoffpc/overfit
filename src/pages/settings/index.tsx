import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBuilding, faKey, faUser } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";

import Avatar from "components/Avatar";
import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import SidebarTabs from "components/SidebarTabs";
import type { SidebarTab } from "components/SidebarTabs";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import SettingsKeysContent from "pages/settings/api-keys";
import SettingsOrganizationsContent from "pages/settings/organizations";
import SettingsProfileContent from "pages/settings/profile";
import { getMe, useAccountsStore } from "stores/accounts";

const tabs = [
  { id: "profile", path: "/settings/profile", label: "Profile", icon: faUser },
  { id: "organizations", path: "/settings/organizations", label: "Organizations", icon: faBuilding },
  { id: "api-keys", path: "/settings/api-keys", label: "API Keys", icon: faKey },
] as const satisfies readonly { id: string; path: string; label: string; icon: IconDefinition }[];

export default function SettingsPage(): ReactElement {
  const user = useAccountsStore(getMe);
  const [location] = useLocation();
  const sidebarTabs: SidebarTab[] = tabs.map((tab) => ({ id: tab.id, label: tab.label, href: tab.path, icon: tab.icon }));
  const activeTabId = sidebarTabs.find((tab) => location === tab.href || location.startsWith(`${tab.href}/`))?.id ?? "profile";

  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar breadcrumbs={[{ label: "Settings" }]} pageWidth="80rem" />

      <NotebookShell columns="18.75rem 1fr" className="max-w-7xl">
        <aside
          className="relative px-4 lg:border-r lg:pb-6 lg:pr-5"
          style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}
        >
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>User Data</p>
          <h1 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Settings</h1>
          {user ? (
            <div className="hidden items-center gap-3 lg:flex" style={{ height: `${String(2 * RULED_LINE_HEIGHT)}rem`, marginTop: RULED_LINE }}>
              <Avatar handle={user.handle} name={user.name} className="h-12 w-12 shrink-0 text-md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-text mb-1">{user.name}</p>
                <p className="truncate text-[0.6875rem] leading-5 text-brand-textMuted pb-[0.125rem]">@{user.handle}</p>
              </div>
            </div>
          ) : null}
          <SidebarTabs tabs={sidebarTabs} activeTabId={activeTabId} />
        </aside>

        <Switch>
          <Route path="/settings/profile" component={SettingsProfileContent} />
          <Route path="/settings/organizations" component={SettingsOrganizationsContent} />
          <Route path="/settings/api-keys" component={SettingsKeysContent} />
          <Route path="/settings/*"><Redirect to="/settings/profile" /></Route>
        </Switch>
      </NotebookShell>
    </div>
  );
}
