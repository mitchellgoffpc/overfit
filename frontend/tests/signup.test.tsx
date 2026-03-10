import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  API_VERSION,
  EMAIL_IN_USE_ERROR,
  EMAIL_INVALID_ERROR,
  USERNAME_HINT,
  USERNAME_IN_USE_ERROR
} from "@underfit/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import SignupPage from "pages/signup";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("wouter", async () => {
  const actual = await vi.importActual("wouter");
  return { ...actual, useLocation: () => ["/signup", navigateMock] };
});

const apiBase = `http://localhost:4000/api/${API_VERSION}`;
const user = {
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

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("SignupRoute", () => {
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

  it("shows validation errors for email, password, and username", async () => {
    const { hook } = memoryLocation({ path: "/signup" });

    render(
      <Router hook={hook}>
        <SignupPage />
      </Router>
    );

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);
    const emailError = await screen.findByText(EMAIL_INVALID_ERROR);
    expect(emailError).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();

    const passwordInput = screen.getByLabelText(/Password/);
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.blur(passwordInput);
    const passwordError = await screen.findByText(/Password must/);
    expect(passwordError).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/Username/);
    fireEvent.change(usernameInput, { target: { value: "bad name" } });
    fireEvent.blur(usernameInput);
    const usernameHint = screen.getByText(USERNAME_HINT);
    expect(usernameHint).toBeInTheDocument();
    expect(usernameInput).toBeInTheDocument();
  });

  it("checks email availability and surfaces conflicts", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ exists: true }));
    const { hook } = memoryLocation({ path: "/signup" });

    render(
      <Router hook={hook}>
        <SignupPage />
      </Router>
    );

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "existing@underfit.local" } });
    fireEvent.blur(emailInput);

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/email-exists?email=existing%40underfit.local`);
    const error = await screen.findByText(EMAIL_IN_USE_ERROR);
    expect(error).toBeInTheDocument();
  });

  it("checks username availability and surfaces conflicts", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ exists: true }));
    const { hook } = memoryLocation({ path: "/signup" });

    render(
      <Router hook={hook}>
        <SignupPage />
      </Router>
    );

    const usernameInput = screen.getByLabelText(/Username/);
    fireEvent.change(usernameInput, { target: { value: "existing-user" } });
    fireEvent.blur(usernameInput);

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/handle-exists?handle=existing-user`);
    const error = await screen.findByText(USERNAME_IN_USE_ERROR);
    expect(error).toBeInTheDocument();
  });

  it("prevents submission when validation errors are present", async () => {
    const { hook } = memoryLocation({ path: "/signup" });

    render(
      <Router hook={hook}>
        <SignupPage />
      </Router>
    );

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);
    await screen.findByText(EMAIL_INVALID_ERROR);

    const submitButton = screen.getByRole("button", { name: "Create account" });
    expect(submitButton).toBeDisabled();
    fireEvent.click(submitButton);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows submission errors inside the form", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Sign up failed" }, { ok: false, status: 400 }));
    const { hook } = memoryLocation({ path: "/signup" });

    render(
      <Router hook={hook}>
        <SignupPage />
      </Router>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@underfit.local" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "password1" } });
    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: "new-user" } });
    const submitButton = screen.getByRole("button", { name: "Create account" });
    const form = submitButton.closest("form");
    fireEvent.click(submitButton);

    expect(form).not.toBeNull();
    if (!form) {
      throw new Error("Expected signup form to exist");
    }
    expect(await within(form).findByText("Sign up failed")).toBeInTheDocument();
  });

  it("stores the session token and navigates on successful signup", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ session: { token: "token-456" }, user }));
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const { hook } = memoryLocation({ path: "/signup" });

    render(
      <Router hook={hook}>
        <SignupPage />
      </Router>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@underfit.local" } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "password1" } });
    fireEvent.change(screen.getByLabelText(/Username/), { target: { value: "new-user" } });
    const submitButton = screen.getByRole("button", { name: "Create account" });
    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    if (!form) {
      throw new Error("Expected signup form to exist");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith("underfitSessionToken", "token-456");
      expect(navigateMock).toHaveBeenCalledWith("/");
    });

    setItemSpy.mockRestore();
  });
});
