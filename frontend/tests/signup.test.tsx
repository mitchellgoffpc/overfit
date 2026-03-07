import {
  API_VERSION,
  EMAIL_IN_USE_ERROR,
  EMAIL_INVALID_ERROR,
  USERNAME_HINT,
  USERNAME_IN_USE_ERROR
} from "@overfit/types";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SignupRoute from "routes/signup";

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

describe("SignupRoute", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows validation errors for email, password, and username", async () => {
    render(
      <MemoryRouter>
        <SignupRoute />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);
    const emailError = await screen.findByText(EMAIL_INVALID_ERROR);
    expect(emailError).toHaveClass("auth__hint--error");
    expect(emailInput).toHaveClass("auth__input--error");

    const passwordInput = screen.getByLabelText(/Password/);
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.blur(passwordInput);
    const passwordError = await screen.findByText(/Password must/);
    expect(passwordError).toHaveClass("auth__hint--error");
    expect(passwordInput).toHaveClass("auth__input--error");

    const usernameInput = screen.getByLabelText(/Username/);
    fireEvent.change(usernameInput, { target: { value: "bad name" } });
    fireEvent.blur(usernameInput);
    const usernameHint = screen.getByText(USERNAME_HINT);
    expect(usernameHint).toHaveClass("auth__hint--error");
    expect(usernameInput).toHaveClass("auth__input--error");
  });

  it("checks email availability and surfaces conflicts", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ exists: true }));

    render(
      <MemoryRouter>
        <SignupRoute />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "existing@overfit.local" } });
    fireEvent.blur(emailInput);

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/email-exists?email=existing%40overfit.local`);
    const error = await screen.findByText(EMAIL_IN_USE_ERROR);
    expect(error).toHaveClass("auth__hint--error");
  });

  it("checks username availability and surfaces conflicts", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ exists: true }));

    render(
      <MemoryRouter>
        <SignupRoute />
      </MemoryRouter>
    );

    const usernameInput = screen.getByLabelText(/Username/);
    fireEvent.change(usernameInput, { target: { value: "existing-user" } });
    fireEvent.blur(usernameInput);

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/username-exists?username=existing-user`);
    const error = await screen.findByText(USERNAME_IN_USE_ERROR);
    expect(error).toHaveClass("auth__hint--error");
  });

  it("prevents submission when validation errors are present", async () => {
    render(
      <MemoryRouter>
        <SignupRoute />
      </MemoryRouter>
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

    render(
      <MemoryRouter>
        <SignupRoute />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@overfit.local" } });
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
});
