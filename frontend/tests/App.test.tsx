import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import IndexRoute from "routes";
import LoginRoute from "routes/login";

describe("IndexRoute", () => {
  it("redirects to login when unauthenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<IndexRoute />} />
          <Route path="/login" element={<LoginRoute />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Sign in to Underfit" })).toBeInTheDocument();
  });
});
