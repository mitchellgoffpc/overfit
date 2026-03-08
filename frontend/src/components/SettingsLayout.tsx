import type { User } from "@underfit/types";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import Navbar from "components/Navbar";

interface SettingsLayoutProps {
  readonly user: User | null;
  readonly activeTab: "profile" | "api-keys";
  readonly title: string;
  readonly description: string;
  readonly children: ReactElement;
}

export default function SettingsLayout({ user, activeTab, title, description, children }: SettingsLayoutProps): ReactElement {
  const displayName = user?.name ?? user?.displayName ?? "workspace";
  const handle = user?.handle ?? "workspace";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar user={user} locationLabel="Settings" />

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col gap-6 border-b border-brand-border bg-[#f0f6f7] px-5 py-6 lg:border-b-0 lg:border-r">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-textMuted">Settings</p>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-brand-textMuted">@{handle}</p>
          </div>
          <div className="grid gap-2">
            <Link
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${activeTab === "profile" ? "border-brand-accent bg-white text-brand-text" : "border-transparent text-brand-textMuted hover:border-brand-border hover:bg-white"}`}
              to="/settings/profile"
            >
              Profile
            </Link>
            <Link
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${activeTab === "api-keys" ? "border-brand-accent bg-white text-brand-text" : "border-transparent text-brand-textMuted hover:border-brand-border hover:bg-white"}`}
              to="/settings/keys"
            >
              API Keys
            </Link>
          </div>
        </aside>

        <main className="p-6 lg:p-8">
          <header className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{handle}</p>
            <h1 className="mt-1 font-display text-3xl">{title}</h1>
            <p className="mt-2 text-[13px] text-brand-textMuted">{description}</p>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
