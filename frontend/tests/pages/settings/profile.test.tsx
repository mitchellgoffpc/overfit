import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@underfit/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SettingsProfileContent from "pages/settings/profile";
import { useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";

const uploadAvatarMock = vi.hoisted(() => vi.fn());
const deleteAvatarMock = vi.hoisted(() => vi.fn());

vi.mock("stores/accounts", async () => {
  const actual = await vi.importActual("stores/accounts");
  return { ...actual, uploadCurrentUserAvatar: uploadAvatarMock, deleteCurrentUserAvatar: deleteAvatarMock };
});

const user: User = {
  id: "user-1",
  handle: "ada",
  name: "Ada Lovelace",
  type: "USER",
  email: "ada@underfit.local",
  bio: "Hello, world",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

describe("SettingsProfileContent", () => {
  let updateProfileMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateProfileMock = vi.fn().mockResolvedValue({ ok: true });
    useAuthStore.setState({ status: "authenticated", currentHandle: "ada" });
    useAccountsStore.setState({ accounts: { ada: user }, updateProfile: updateProfileMock as never });
    uploadAvatarMock.mockReset().mockResolvedValue({ ok: true });
    deleteAvatarMock.mockReset().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("Update profile calls updateProfile with the current form values", async () => {
    render(<SettingsProfileContent />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada Byron" } });
    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Pioneer" } });
    fireEvent.click(screen.getByRole("button", { name: "Update profile" }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith("Ada Byron", "Pioneer");
    });
  });

  it("Update profile shows Saved on success", async () => {
    render(<SettingsProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: "Update profile" }));

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("Update profile shows error message on failure", async () => {
    updateProfileMock.mockResolvedValue({ ok: false, error: "Something went wrong" });
    render(<SettingsProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: "Update profile" }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("Remove button calls deleteCurrentUserAvatar", async () => {
    render(<SettingsProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(deleteAvatarMock).toHaveBeenCalled();
    });
  });

  it("Remove button shows success status after deletion", async () => {
    render(<SettingsProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(screen.getByText("Profile picture removed")).toBeInTheDocument();
    });
  });

  it("Remove button shows error message on failure", async () => {
    deleteAvatarMock.mockResolvedValue({ ok: false, error: "Delete failed" });
    render(<SettingsProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });
  });

  it("selecting a file calls uploadCurrentUserAvatar with the file", async () => {
    render(<SettingsProfileContent />);

    const file = new File(["img"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector<HTMLInputElement>("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadAvatarMock).toHaveBeenCalledWith(file);
    });
  });

  it("uploading a file shows success status", async () => {
    render(<SettingsProfileContent />);

    const file = new File(["img"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector<HTMLInputElement>("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Profile picture updated")).toBeInTheDocument();
    });
  });

  it("uploading a file shows error message on failure", async () => {
    uploadAvatarMock.mockResolvedValue({ ok: false, error: "Upload failed" });
    render(<SettingsProfileContent />);

    const file = new File(["img"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector<HTMLInputElement>("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });
});
