import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import type { AroundNavHandler } from "wouter";
import { Router, Redirect, Route, Switch, useLocation } from "wouter";

import HomePage from "pages/home";
import LoginPage from "pages/login";
import ProfilePage from "pages/profile";
import ProjectComparePage from "pages/projects/compare";
import ProjectDetailPage from "pages/projects/detail";
import RunDetailPage from "pages/projects/run";
import SettingsPage from "pages/settings/index";
import SignupPage from "pages/signup";
import { useAuthStore } from "stores/auth";

function AuthLayout({ children }: { readonly children: ReactNode }): ReactElement {
  const status = useAuthStore((state) => state.status);
  const loadAuth = useAuthStore((state) => state.loadAuth);

  useEffect(() => {
    if (status === "idle") { void loadAuth(); }
  }, [loadAuth, status]);

  if (status === "loading" || status === "idle") { return <div />; }
  if (status === "unauthenticated") { return <Redirect to="/login" />; }

  return children as ReactElement;
}

function CurrentUserProfileRedirect(): ReactElement {
  const currentHandle = useAuthStore((state) => state.currentHandle);
  return <Redirect to={currentHandle ? `/${currentHandle}` : "/"} />;
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
              <Route path="/profile" component={CurrentUserProfileRedirect} />
              <Route path="/settings/*" component={SettingsPage} />
              <Route path="/:handle/:projectName/compare" component={ProjectComparePage} />
              <Route path="/:handle/:projectName" component={ProjectDetailPage} />
              <Route path="/:handle/:projectName/runs/:runName" component={RunDetailPage} />
              <Route path="/:handle" component={ProfilePage} />
            </Switch>
          </AuthLayout>
        </Route>
      </Switch>
    </Router>
  );
}
