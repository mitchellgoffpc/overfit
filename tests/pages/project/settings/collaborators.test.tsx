import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CollaboratorsSettings from "pages/project/settings/collaborators";
import { buildProjectKey, useProjectStore } from "stores/projects";
import type { Project, User } from "types";

const addCollaboratorMock = vi.hoisted(() => vi.fn());
const removeCollaboratorMock = vi.hoisted(() => vi.fn());
const searchUsersMock = vi.hoisted(() => vi.fn());

vi.mock("stores/projects", async () => {
  const actual = await vi.importActual("stores/projects");
  return { ...actual, addCollaborator: addCollaboratorMock, removeCollaborator: removeCollaboratorMock, searchUsers: searchUsersMock };
});

const project: Project = {
  id: "project-1",
  owner: "ada",
  name: "demo",
  description: "Demo project",
  visibility: "private",
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z",
};

const searchResult: User = {
  id: "user-1",
  type: "USER",
  handle: "test",
  email: "test@example.com",
  name: "",
  bio: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const existingCollaborator: User = {
  id: "user-2",
  type: "USER",
  handle: "grace",
  email: "grace@example.com",
  name: "Grace Hopper",
  bio: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("CollaboratorsSettings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    addCollaboratorMock.mockReset().mockResolvedValue({ ok: true });
    removeCollaboratorMock.mockReset().mockResolvedValue({ ok: true });
    searchUsersMock.mockReset().mockResolvedValue({ ok: true, body: [searchResult] });
    useProjectStore.setState({
      collaboratorsByKey: { [buildProjectKey(project.owner, project.name)]: [existingCollaborator] },
      fetchCollaborators: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("shows searchable results with avatar metadata and invites from a result row", async () => {
    render(<CollaboratorsSettings project={project} />);

    fireEvent.click(screen.getByRole("button", { name: "Add people" }));
    const search = screen.getByPlaceholderText("Type a handle, email, or full name");
    fireEvent.change(search, { target: { value: "test" } });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(searchUsersMock).toHaveBeenCalledWith("test");
    expect(screen.getByText("@test - invite collaborator")).toBeInTheDocument();
    expect(screen.getAllByText("test").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("@test - invite collaborator"));

    expect(addCollaboratorMock).toHaveBeenCalledWith("ada", "demo", "test");
  });
});
