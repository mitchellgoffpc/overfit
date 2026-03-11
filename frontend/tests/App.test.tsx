import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Router, Route, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import LoginPage from "pages/login";
import { useAuthStore } from "stores/auth";

describe("IndexRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, sessionToken: null, status: "unauthenticated" });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("redirects to login when unauthenticated", () => {
    const { hook } = memoryLocation({ path: "/login" });

    render(
      <Router hook={hook}>
        <Switch>
          <Route path="/login" component={LoginPage} />
        </Switch>
      </Router>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Sign in to Underfit" })).toBeInTheDocument();
  });
});
