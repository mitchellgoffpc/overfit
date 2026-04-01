import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import ResetPasswordPage from "pages/reset-password";
import { useAuthStore } from "stores/auth";
import { API_BASE } from "types";

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("ResetPasswordRoute", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useAuthStore.setState({ status: "unauthenticated", currentHandle: null });
    window.history.replaceState({}, "", "/reset-password");
  });

  afterEach(() => {
    cleanup();
  });

  it("uses token from query string and submits password reset", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));
    window.history.replaceState({}, "", "/reset-password?token=email-token");
    const { hook } = memoryLocation({ path: "/reset-password" });

    render(
      <Router hook={hook}>
        <ResetPasswordPage />
      </Router>
    );

    expect(screen.getByLabelText("Reset token")).toHaveValue("email-token");
    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: "newpassword1" } });
    const submitButton = screen.getByRole("button", { name: "Update password" });
    fireEvent.click(submitButton);

    expect(await screen.findByText("Your password was reset successfully.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/auth/reset-password`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "email-token", password: "newpassword1" })
    });
  });

  it("shows backend reset token errors", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Invalid or expired reset token" }, { ok: false, status: 400 }));
    window.history.replaceState({}, "", "/reset-password?token=expired-token");
    const { hook } = memoryLocation({ path: "/reset-password" });

    render(
      <Router hook={hook}>
        <ResetPasswordPage />
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: "newpassword1" } });
    const submitButton = screen.getByRole("button", { name: "Update password" });
    fireEvent.click(submitButton);

    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    if (!form) {
      throw new Error("Expected reset password form to exist");
    }
    expect(await within(form).findByText("Invalid or expired reset token")).toBeInTheDocument();
  });
});
