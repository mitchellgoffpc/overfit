import { describe, expect, it } from "vitest";

import { getRunColor } from "colors";

describe("run colors", () => {
  it("generates stable colors from run ids", () => {
    expect(getRunColor("run-1")).toBe(getRunColor("run-1"));
    expect(getRunColor("run-1")).not.toBe(getRunColor("run-2"));
  });

  it("returns hex colors", () => {
    expect(getRunColor("run-1")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
