import type { ReactElement } from "react";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";

import Navbar from "components/Navbar";
import SettingsKeysContent from "pages/settings/keys";
import SettingsProfileContent from "pages/settings/profile";
import { useAuthStore } from "store/auth";

const tabs = [
  { path: "/settings/profile", label: "Profile", title: "Profile", description: "Update the name and bio shown across your workspace." },
  { path: "/settings/keys", label: "API Keys", title: "API Keys", description: "Manage the API keys used to authenticate scripts and agents." },
] as const;

export default function SettingsPage(): ReactElement {
  const user = useAuthStore((state) => state.user);
  const [location] = useLocation();
  const displayName = user?.name ?? user?.displayName ?? "workspace";
  const handle = user?.handle ?? "workspace";
  const activeTab = tabs.find((tab) => tab.path === location) ?? tabs[0];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar locationLabel="Settings" />

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-6 border-b border-brand-border bg-[#f0f6f7] px-5 py-6 lg:border-b-0 lg:border-r">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-textMuted">Settings</p>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-brand-textMuted">@{handle}</p>
          </div>
          <div className="grid gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${tab.path === activeTab.path ? "border-brand-accent bg-white text-brand-text" : "border-transparent text-brand-textMuted hover:border-brand-border hover:bg-white"}`}
                href={tab.path}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </aside>

        <main className="p-6 lg:p-8">
          <header className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{handle}</p>
            <h1 className="mt-1 font-display text-3xl">{activeTab.title}</h1>
            <p className="mt-2 text-[13px] text-brand-textMuted">{activeTab.description}</p>
          </header>

          <Switch>
            <Route path="/settings/profile" component={SettingsProfileContent} />
            <Route path="/settings/keys" component={SettingsKeysContent} />
            <Route path="/settings/*"><Redirect to="/settings/profile" /></Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}
