import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import { Redirect, Route, Switch } from "wouter";

import HomePage from "pages/home";
import LoginPage from "pages/login";
import ProfilePage from "pages/profile";
import ProjectDetailPage from "pages/projects/detail";
import RunDetailPage from "pages/projects/run";
import SettingsIndexPage from "pages/settings/index";
import SettingsKeysPage from "pages/settings/keys";
import SettingsProfilePage from "pages/settings/profile";
import SignupPage from "pages/signup";
import { useAuthStore } from "store/auth";

function AuthLayout({ children }: { readonly children: ReactNode }): ReactElement {
  const status = useAuthStore((state) => state.status);
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  if (status === "loading" || status === "idle") { return <div />; }
  if (status === "unauthenticated") { return <Redirect to="/login" />; }

  return children as ReactElement;
}

export function AppRouter(): ReactElement {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route>
        <AuthLayout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/settings" component={SettingsIndexPage} />
            <Route path="/settings/profile" component={SettingsProfilePage} />
            <Route path="/settings/keys" component={SettingsKeysPage} />
            <Route path="/projects/:projectId" component={ProjectDetailPage} />
            <Route path="/projects/:projectId/runs/:runId" component={RunDetailPage} />
          </Switch>
        </AuthLayout>
      </Route>
    </Switch>
  );
}
