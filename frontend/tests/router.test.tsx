import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Router, Route, Switch } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import LoginPage from "pages/login";
import { useAuthStore } from "stores/auth";

describe("IndexRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "unauthenticated", currentHandle: null });
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
