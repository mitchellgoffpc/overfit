import type { ReactElement } from "react";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

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

function AuthLayout(): ReactElement {
  const status = useAuthStore((state) => state.status);
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  if (status === "loading" || status === "idle") { return <div />; }
  if (status === "unauthenticated") { return <Navigate to="/login" replace />; }

  return <Outlet />;
}

export function AppRouter(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<AuthLayout />}>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings">
            <Route index element={<SettingsIndexPage />} />
            <Route path="profile" element={<SettingsProfilePage />} />
            <Route path="keys" element={<SettingsKeysPage />} />
          </Route>
          <Route path="projects/:projectId">
            <Route index element={<ProjectDetailPage />} />
            <Route path="runs/:runId" element={<RunDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
