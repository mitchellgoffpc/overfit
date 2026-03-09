import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { API_VERSION } from "@underfit/types";
import type { User } from "@underfit/types";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Navbar from "components/Navbar";
import { useAuthStore } from "store/auth";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

const user: User = {
  id: "user-1",
  handle: "ada",
  displayName: "Ada Lovelace",
  type: "USER",
  email: "ada@underfit.local",
  name: "Ada Lovelace",
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
    localStorage.clear();
    useAuthStore.setState({ user: null, sessionToken: null, status: "idle" });
  });

  afterEach(() => {
    cleanup();
  });

  it("logs out with a session token and clears auth state", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    localStorage.setItem("underfitSessionToken", "token-123");
    useAuthStore.setState({ user, sessionToken: "token-123", status: "authenticated" });

    render(
      <MemoryRouter>
        <Navbar user={user} locationLabel="Projects" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign Out" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/logout`, {
        method: "POST",
        headers: { Authorization: "Bearer token-123" }
      });
      expect(navigateMock).toHaveBeenCalledWith("/login");
    });

    expect(localStorage.getItem("underfitSessionToken")).toBeNull();
    expect(useAuthStore.getState().sessionToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logs out without calling the API when no token exists", async () => {
    useAuthStore.setState({ user, sessionToken: null, status: "authenticated" });

    render(
      <MemoryRouter>
        <Navbar user={user} locationLabel="Projects" />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign Out" }));

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith("/login");
    });

    expect(localStorage.getItem("underfitSessionToken")).toBeNull();
    expect(useAuthStore.getState().sessionToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
