import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { API_VERSION, CREDENTIALS_INVALID_ERROR } from "@underfit/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import LoginPage from "pages/login";
import { useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("wouter", async () => {
  const actual = await vi.importActual("wouter");
  return { ...actual, useLocation: () => ["/login", navigateMock] };
});

const apiBase = `http://localhost:4000/api/${API_VERSION}`;
const user = {
  id: "user-1",
  handle: "ada",
  name: "Ada Lovelace",
  type: "USER",
  email: "ada@underfit.local",
  bio: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("LoginRoute", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    navigateMock.mockReset();
    useAuthStore.setState({ status: "unauthenticated", currentHandle: null });
    useAccountsStore.setState({ accounts: {} });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the backend error when login fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: CREDENTIALS_INVALID_ERROR }, { ok: false, status: 401 }));
    const { hook } = memoryLocation({ path: "/login" });

    render(
      <Router hook={hook}>
        <LoginPage />
      </Router>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@underfit.local" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "wrongpass1" } });
    const submitButton = screen.getByRole("button", { name: "Sign in" });
    fireEvent.click(submitButton);

    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    if (!form) {
      throw new Error("Expected login form to exist");
    }
    expect(await within(form).findByText(CREDENTIALS_INVALID_ERROR)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/login`, expect.any(Object));
  });

  it("navigates on successful login", async () => {
    useAuthStore.setState({ status: "unauthenticated", currentHandle: null });
    fetchMock.mockResolvedValueOnce(createResponse({ session: { token: "token-123" }, user }));
    const { hook } = memoryLocation({ path: "/login" });

    render(
      <Router hook={hook}>
        <LoginPage />
      </Router>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@underfit.local" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "correctpass1" } });
    const submitButton = screen.getByRole("button", { name: "Sign in" });
    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    if (!form) {
      throw new Error("Expected login form to exist");
    }
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });
    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});
