import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import ProfileRoute from "pages/profile";
import { useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";
import { useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";
import type { Project, Run, User } from "types";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("wouter", async () => {
  const actual = await vi.importActual("wouter");
  return { ...actual, useLocation: () => ["/ada", navigateMock] };
});

vi.mock("components/Navbar", () => ({ default: () => <div data-testid="mock-navbar" /> }));
vi.mock("components/profile/ProfileActivityHeatmap", () => ({ default: () => <div data-testid="mock-activity-heatmap" /> }));

const user: User = {
  id: "user-1",
  handle: "ada",
  name: "Ada Lovelace",
  type: "USER",
  email: "ada@underfit.local",
  bio: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

const project: Project = {
  id: "project-1",
  name: "mnist-classifier",
  description: "A digit classifier",
  owner: "ada",
  visibility: "private",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

const run: Run = {
  id: "run-1",
  name: "run-abc123",
  projectId: "project-1",
  projectOwner: "ada",
  projectName: "mnist-classifier",
  user: "ada",
  status: "finished",
  config: null,
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z"
};

describe("ProfileRoute", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    navigateMock.mockReset();
    useAuthStore.setState({ status: "authenticated", currentHandle: "ada" });
    useAccountsStore.setState({ accounts: { ada: user } });
    useProjectStore.setState({ projectsByKey: { "ada/mnist-classifier": project }, isLoading: false, error: null, fetchProjects: vi.fn() });
    useRunStore.setState({ runsByKey: { "run-1": run }, isLoading: false, error: null, fetchRuns: vi.fn() });
  });

  afterEach(() => {
    cleanup();
  });

  it("project link navigates to the project page", () => {
    const { hook } = memoryLocation({ path: "/ada" });

    render(
      <Router hook={hook}>
        <Route path="/:handle" component={ProfileRoute} />
      </Router>
    );

    const projectLinks = screen.getAllByRole("link", { name: /mnist-classifier/ });
    expect(projectLinks.some((link) => link.getAttribute("href") === "/ada/mnist-classifier")).toBe(true);
  });

  it("run link navigates to the run page", () => {
    const { hook } = memoryLocation({ path: "/ada" });

    render(
      <Router hook={hook}>
        <Route path="/:handle" component={ProfileRoute} />
      </Router>
    );

    const runLink = screen.getByRole("link", { name: /run-abc123/ });
    expect(runLink).toHaveAttribute("href", "/ada/mnist-classifier/runs/run-abc123");
  });

  it("shows the Edit profile button on the current user's own profile", () => {
    const { hook } = memoryLocation({ path: "/ada" });

    render(
      <Router hook={hook}>
        <Route path="/:handle" component={ProfileRoute} />
      </Router>
    );

    expect(screen.getByRole("link", { name: "Edit profile" })).toBeInTheDocument();
  });

  it("does not show the Edit profile button on another user's profile", () => {
    useAuthStore.setState({ status: "authenticated", currentHandle: "other" });
    const { hook } = memoryLocation({ path: "/ada" });

    render(
      <Router hook={hook}>
        <Route path="/:handle" component={ProfileRoute} />
      </Router>
    );

    expect(screen.queryByRole("link", { name: "Edit profile" })).toBeNull();
  });

  it("Edit profile button links to the settings page", () => {
    const { hook } = memoryLocation({ path: "/ada" });

    render(
      <Router hook={hook}>
        <Route path="/:handle" component={ProfileRoute} />
      </Router>
    );

    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/settings/profile");
  });
});
