import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import type { AroundNavHandler } from "wouter";
import { Router, Redirect, Route, Switch, useLocation } from "wouter";

import HomePage from "pages/home";
import LoginPage from "pages/login";
import ProfilePage from "pages/profile";
import ProjectDetailPage from "pages/projects/detail";
import RunDetailPage from "pages/projects/run";
import SettingsPage from "pages/settings/index";
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
  const [location] = useLocation();
  const aroundNav: AroundNavHandler = (navigate, to, options) => {
    if (to !== location) { navigate(to, options); }
  };

  return (
    <Router aroundNav={aroundNav}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route>
          <AuthLayout>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/settings/*" component={SettingsPage} />
              <Route path="/:handle/projects/:projectName" component={ProjectDetailPage} />
              <Route path="/:handle/projects/:projectName/runs/:runName" component={RunDetailPage} />
            </Switch>
          </AuthLayout>
        </Route>
      </Switch>
    </Router>
  );
}
