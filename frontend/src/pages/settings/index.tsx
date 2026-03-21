import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBuilding, faKey, faUser } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";

import Navbar from "components/Navbar";
import SettingsKeysContent from "pages/settings/api-keys";
import SettingsOrganizationsContent from "pages/settings/organizations";
import SettingsProfileContent from "pages/settings/profile";

const tabs = [
  { id: "profile", path: "/settings/profile", label: "Profile", icon: faUser, tint: "#f6fbf8", tintActive: "#fcfffd" },
  { id: "organizations", path: "/settings/organizations", label: "Organizations", icon: faBuilding, tint: "#f4f8fc", tintActive: "#fbfdff" },
  { id: "api-keys", path: "/settings/api-keys", label: "API Keys", icon: faKey, tint: "#f8f5fc", tintActive: "#fdfbff" },
] as const satisfies readonly { id: string; path: string; label: string; icon: IconDefinition; tint: string; tintActive: string }[];

export default function SettingsPage(): ReactElement {
  const [location] = useLocation();
  const activeTab = tabs.find((tab) => tab.path === location) ?? tabs[0];
  const pageClass = "min-h-screen bg-[#e9efed] text-brand-text";
  const shellClass = "relative mx-auto w-full max-w-7xl overflow-visible border-x border-b border-[#c4d1d1]"
    + " bg-[#f8fcfa] shadow-[0_14px_36px_rgba(30,52,52,0.18)]";

  return (
    <div className={pageClass}>
      <Navbar
        breadcrumbs={[{ label: "Settings" }]}
        tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, href: tab.path, icon: tab.icon, tint: tab.tint, tintActive: tab.tintActive }))}
        activeTabId={activeTab.id}
        tabsMaxWidth="80rem"
      />

      <div className={shellClass}>
        <div
          className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[14px] bg-[#dce7e4]"
          aria-hidden
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.2) 1px, transparent 1px)", backgroundSize: "100% 30px" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-10 top-0 w-px bg-[#efb1b1]/70" aria-hidden />

        <main className="relative">
          <Switch>
            <Route path="/settings/profile" component={SettingsProfileContent} />
            <Route path="/settings/organizations" component={SettingsOrganizationsContent} />
            <Route path="/settings/api-keys" component={SettingsKeysContent} />
            <Route path="/settings/*"><Redirect to="/settings/profile" /></Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}
