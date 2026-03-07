import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IndexRoute from "routes";

describe("IndexRoute", () => {
  it("renders the home heading", () => {
    render(<IndexRoute />);

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  });
});
