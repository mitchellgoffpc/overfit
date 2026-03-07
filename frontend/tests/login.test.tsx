import { API_VERSION, CREDENTIALS_INVALID_ERROR } from "@overfit/types";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LoginRoute from "routes/login";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

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
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the backend error when login fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: CREDENTIALS_INVALID_ERROR }, { ok: false, status: 401 }));

    render(
      <MemoryRouter>
        <LoginRoute />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@overfit.local" } });
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

  it("stores the session token and navigates on successful login", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ session: { token: "token-123" } }));
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(
      <MemoryRouter>
        <LoginRoute />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@overfit.local" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "correctpass1" } });
    const submitButton = screen.getByRole("button", { name: "Sign in" });
    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    if (!form) {
      throw new Error("Expected login form to exist");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith("overfitSessionToken", "token-123");
      expect(navigateMock).toHaveBeenCalledWith("/");
    });

    setItemSpy.mockRestore();
  });
});
