import { cleanup, fireEvent, render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SettingsKeysContent from "pages/settings/api-keys";
import { useAuthStore } from "stores/auth";
import type { ApiKey, ApiKeyWithToken } from "types";

const loadApiKeysMock = vi.hoisted(() => vi.fn());
const createApiKeyMock = vi.hoisted(() => vi.fn());
const deleteApiKeyMock = vi.hoisted(() => vi.fn());

vi.mock("stores/auth", async () => {
  const actual = await vi.importActual("stores/auth");
  return { ...actual, loadApiKeys: loadApiKeysMock, createApiKey: createApiKeyMock, deleteApiKey: deleteApiKeyMock };
});

const existingKey: ApiKey = {
  id: "key-1",
  userId: "user-1",
  label: "Local training rig",
  createdAt: "2025-01-01T00:00:00.000Z"
};

const newKeyWithToken: ApiKeyWithToken = {
  id: "key-2",
  userId: "user-1",
  label: "CI runner",
  token: "uf_secret_abc123",
  createdAt: "2025-06-01T00:00:00.000Z"
};

describe("SettingsKeysContent", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "authenticated", currentHandle: "ada" });
    loadApiKeysMock.mockReset().mockResolvedValue({ ok: true, body: [existingKey] });
    createApiKeyMock.mockReset().mockResolvedValue({ ok: true, body: newKeyWithToken });
    deleteApiKeyMock.mockReset().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads and displays existing API keys on mount", async () => {
    render(<SettingsKeysContent />);

    expect(await screen.findByText("Local training rig")).toBeInTheDocument();
  });

  it("adding a key calls createApiKey with the entered label", () => {
    render(<SettingsKeysContent />);

    fireEvent.change(screen.getByPlaceholderText("Local training rig"), { target: { value: "CI runner" } });
    fireEvent.click(screen.getByRole("button", { name: "Add key" }));

    expect(createApiKeyMock).toHaveBeenCalledWith("CI runner");
  });

  it("new key appears in the active keys section after creation", async () => {
    render(<SettingsKeysContent />);

    fireEvent.change(screen.getByPlaceholderText("Local training rig"), { target: { value: "CI runner" } });
    fireEvent.click(screen.getByRole("button", { name: "Add key" }));

    expect(await screen.findByText("CI runner")).toBeInTheDocument();
  });

  it("newly created key token is displayed after creation", async () => {
    render(<SettingsKeysContent />);

    fireEvent.change(screen.getByPlaceholderText("Local training rig"), { target: { value: "CI runner" } });
    fireEvent.click(screen.getByRole("button", { name: "Add key" }));

    expect(await screen.findByText("uf_secret_abc123")).toBeInTheDocument();
  });

  it("adding a key shows an error on failure", async () => {
    createApiKeyMock.mockResolvedValue({ ok: false, error: "Could not create key" });
    render(<SettingsKeysContent />);

    fireEvent.change(screen.getByPlaceholderText("Local training rig"), { target: { value: "CI runner" } });
    fireEvent.click(screen.getByRole("button", { name: "Add key" }));

    expect(await screen.findByText("Could not create key")).toBeInTheDocument();
  });

  it("adding a key with an empty label shows a validation error", () => {
    render(<SettingsKeysContent />);

    fireEvent.click(screen.getByRole("button", { name: "Add key" }));

    expect(screen.getByText("Label is required.")).toBeInTheDocument();
    expect(createApiKeyMock).not.toHaveBeenCalled();
  });

  it("deleting a key calls deleteApiKey with the key id", async () => {
    render(<SettingsKeysContent />);
    expect(await screen.findByText("Local training rig")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteApiKeyMock).toHaveBeenCalledWith("key-1");
  });

  it("deleted key is removed from the active keys section", async () => {
    render(<SettingsKeysContent />);
    expect(await screen.findByText("Local training rig")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitForElementToBeRemoved(() => screen.queryByText("Local training rig"));
  });

  it("deleting a key shows an error on failure", async () => {
    deleteApiKeyMock.mockResolvedValue({ ok: false, error: "Could not delete key" });
    render(<SettingsKeysContent />);
    expect(await screen.findByText("Local training rig")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Could not delete key")).toBeInTheDocument();
  });
});
