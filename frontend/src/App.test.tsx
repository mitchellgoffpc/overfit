import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IndexRoute from "./routes/index";

describe("IndexRoute", () => {
  it("renders the projects heading", () => {
    render(<IndexRoute />);

    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
  });
});
