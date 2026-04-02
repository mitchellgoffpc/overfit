import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import TextInputField from "components/fields/TextInputField";

describe("TextInputField", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls submit handler when clicking submit button", () => {
    const onSubmit = vi.fn(() => undefined);
    render(
      <TextInputField
        label="Project name"
        value="demo"
        onChange={(event) => { void event.currentTarget.value; }}
        submitLabel="Rename"
        onSubmit={() => { onSubmit(); }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("calls submit handler when pressing Enter", () => {
    const onSubmit = vi.fn(() => undefined);
    render(
      <TextInputField
        label="Project name"
        value="demo"
        onChange={(event) => { void event.currentTarget.value; }}
        submitLabel="Rename"
        onSubmit={() => { onSubmit(); }}
      />
    );

    fireEvent.keyDown(screen.getByLabelText("Project name"), { key: "Enter", code: "Enter" });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit when submit button is disabled", () => {
    const onSubmit = vi.fn(() => undefined);
    render(
      <TextInputField
        label="Project name"
        value="demo"
        onChange={(event) => { void event.currentTarget.value; }}
        submitLabel="Rename"
        onSubmit={() => { onSubmit(); }}
        submitDisabled
      />
    );

    const button = screen.getByRole("button", { name: "Rename" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByLabelText("Project name"), { key: "Enter", code: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
