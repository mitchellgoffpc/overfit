import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBuilding, faKey, faUser } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";

import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import { colors } from "colors";
import SettingsKeysContent from "pages/settings/api-keys";
import SettingsOrganizationsContent from "pages/settings/organizations";
import SettingsProfileContent from "pages/settings/profile";

const { profile: profileTab, organizations: orgsTab, apiKeys: apiKeysTab } = colors.settingsTab;
const tabs = [
  { id: "profile", path: "/settings/profile", label: "Profile", icon: faUser, tint: profileTab.tint, tintActive: profileTab.tintActive },
  { id: "organizations", path: "/settings/organizations", label: "Organizations", icon: faBuilding, tint: orgsTab.tint, tintActive: orgsTab.tintActive },
  { id: "api-keys", path: "/settings/api-keys", label: "API Keys", icon: faKey, tint: apiKeysTab.tint, tintActive: apiKeysTab.tintActive },
] as const satisfies readonly { id: string; path: string; label: string; icon: IconDefinition; tint: string; tintActive: string }[];

export default function SettingsPage(): ReactElement {
  const [location] = useLocation();
  const activeTab = tabs.find((tab) => tab.path === location) ?? tabs[0];
  const pageClass = "min-h-screen bg-brand-bgStrong text-brand-text";
  return (
    <div className={pageClass}>
      <Navbar
        breadcrumbs={[{ label: "Settings" }]}
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, href: tab.path, icon: tab.icon, tint: tab.tint, tintActive: tab.tintActive }))}
        activeTabId={activeTab.id}
        tabsMaxWidth="80rem"
      />

      <NotebookShell className="max-w-7xl">
        <main className="relative">
          <Switch>
            <Route path="/settings/profile" component={SettingsProfileContent} />
            <Route path="/settings/organizations" component={SettingsOrganizationsContent} />
            <Route path="/settings/api-keys" component={SettingsKeysContent} />
            <Route path="/settings/*"><Redirect to="/settings/profile" /></Route>
          </Switch>
        </main>
      </NotebookShell>
    </div>
  );
}
