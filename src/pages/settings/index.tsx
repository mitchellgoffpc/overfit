import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBuilding, faKey, faUser } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";

import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import SettingsKeysContent from "pages/settings/api-keys";
import SettingsOrganizationsContent from "pages/settings/organizations";
import SettingsProfileContent from "pages/settings/profile";
import { useAccountsStore } from "stores/accounts";

const tabs = [
  { id: "profile", path: "/settings/profile", label: "Profile", icon: faUser },
  { id: "organizations", path: "/settings/organizations", label: "Organizations", icon: faBuilding },
  { id: "api-keys", path: "/settings/api-keys", label: "API Keys", icon: faKey },
] as const satisfies readonly { id: string; path: string; label: string; icon: IconDefinition }[];

export default function SettingsPage(): ReactElement {
  const [location] = useLocation();
  const activeTab = tabs.find((tab) => tab.path === location) ?? tabs[0];
  const user = useAccountsStore((state) => state.me());
  const notebookDate = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    []
  );

  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar
        breadcrumbs={[{ label: "Settings" }]}
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, href: tab.path, icon: tab.icon }))}
        activeTabId={activeTab.id}
        tabsMaxWidth="100vw"
      />

      <NotebookShell columns="18.75rem 1fr" className="max-w-full md:max-w-[calc(100%-5rem)]">
        <aside
          className="relative pb-5 px-4 lg:border-r lg:pb-6 lg:pr-5"
          style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}
        >
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Lab Notebook</p>
          <h1 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Settings</h1>
          <p className="mt-2 font-mono text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{notebookDate}</p>

          {user ? (
            <>
              <p className="mt-7 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Subject</p>
              <div className="flex items-center justify-between text-[0.75rem]" style={{ height: RULED_LINE }}>
                <span className="text-brand-textMuted">handle</span>
                <span className="font-semibold text-brand-text">@{user.handle}</span>
              </div>
            </>
          ) : null}
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
