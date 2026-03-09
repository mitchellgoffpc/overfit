import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import LoginPage from "pages/login";
import { useAuthStore } from "store/auth";

function AuthGuard() {
  const status = useAuthStore((state) => state.status);
  if (status === "unauthenticated") {
    return <LoginPage />;
  }
  return <Outlet />;
}

describe("IndexRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, sessionToken: null, status: "unauthenticated" });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("redirects to login when unauthenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Home</div>} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Sign in to Underfit" })).toBeInTheDocument();
  });
});
