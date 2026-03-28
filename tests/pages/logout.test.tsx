import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import Navbar from "components/Navbar";
import { useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";
import { API_BASE } from "types";
import type { User } from "types";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("wouter", async () => {
  const actual = await vi.importActual("wouter");
  return { ...actual, useLocation: () => ["/", navigateMock] };
});

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

describe("Navbar logout", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    navigateMock.mockReset();
    useAuthStore.setState({ status: "idle", currentHandle: null });
    useAccountsStore.setState({ accounts: {} });
  });

  afterEach(() => {
    cleanup();
  });

  it("logs out and clears auth state", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.getState().setAccount(user);
    const { hook } = memoryLocation({ path: "/" });

    render(
      <Router hook={hook}>
        <Navbar breadcrumbs={[{ label: "Projects" }]} />
      </Router>
    );

    fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Sign Out" }));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/auth/logout`, { credentials: "include", method: "POST" });
    expect(navigateMock).toHaveBeenCalledWith("/login");

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().currentHandle).toBeNull();
  });

  it("logs out with the session cookie even when no token is stored in memory", async () => {
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.getState().setAccount(user);
    const { hook } = memoryLocation({ path: "/" });

    render(
      <Router hook={hook}>
        <Navbar breadcrumbs={[{ label: "Projects" }]} />
      </Router>
    );

    fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Sign Out" }));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/auth/logout`, { credentials: "include", method: "POST" });
    expect(navigateMock).toHaveBeenCalledWith("/login");

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().currentHandle).toBeNull();
  });
});
