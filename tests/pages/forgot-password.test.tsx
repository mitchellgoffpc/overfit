import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { EMAIL_INVALID_ERROR } from "helpers";
import ForgotPasswordPage from "pages/forgot-password";
import { useAuthStore } from "stores/auth";
import { API_BASE } from "types";

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("ForgotPasswordRoute", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useAuthStore.setState({ status: "unauthenticated", currentHandle: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("validates email before submitting", () => {
    const { hook } = memoryLocation({ path: "/forgot-password" });

    render(
      <Router hook={hook}>
        <ForgotPasswordPage />
      </Router>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@local" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText(EMAIL_INVALID_ERROR)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows confirmation after a successful submission", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));
    const { hook } = memoryLocation({ path: "/forgot-password" });

    render(
      <Router hook={hook}>
        <ForgotPasswordPage />
      </Router>
    );

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "user@underfit.local" } });
    const submitButton = screen.getByRole("button", { name: "Send reset link" });
    fireEvent.click(submitButton);

    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    if (!form) {
      throw new Error("Expected forgot password form to exist");
    }
    expect(await within(form).findByText("If an account exists for that email, you'll receive a reset link shortly.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/auth/forgot-password`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@underfit.local" })
    });
  });
});
