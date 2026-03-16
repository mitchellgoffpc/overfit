import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBuilding, faKey, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";

import Navbar from "components/Navbar";
import SettingsKeysContent from "pages/settings/api-keys";
import SettingsOrganizationsContent from "pages/settings/organizations";
import SettingsProfileContent from "pages/settings/profile";

const tabs = [
  { path: "/settings/profile", label: "Profile", icon: faUser },
  { path: "/settings/organizations", label: "Organizations", icon: faBuilding },
  { path: "/settings/api-keys", label: "API Keys", icon: faKey },
] as const satisfies readonly { path: string; label: string; icon: IconDefinition }[];

export default function SettingsPage(): ReactElement {
  const [location] = useLocation();
  const activeTab = tabs.find((tab) => tab.path === location) ?? tabs[0];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar breadcrumbs={[{ label: "Settings" }]} />

      <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-brand-border px-5 py-6 lg:border-b-0 lg:border-r">
          <div className="grid gap-0.5">
            {tabs.map((tab) => {
              const isActive = tab.path === activeTab.path;
              const activeClass = isActive
                ? "border-brand-border bg-white text-brand-text"
                : "border-transparent text-brand-textMuted hover:border-brand-border hover:bg-white/60 hover:text-brand-text";
              const linkClass = `relative rounded-lg border px-3 py-2 text-sm font-semibold transition ${activeClass}`;
              return (
                <Link key={tab.path} className={linkClass} href={tab.path}>
                  {isActive ? <span className="absolute inset-y-1.5 -left-2 w-1 rounded-full bg-brand-accent" /> : null}
                  <FontAwesomeIcon icon={tab.icon} className="mr-2 h-3.5 w-3.5" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="p-6 lg:p-8">
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
