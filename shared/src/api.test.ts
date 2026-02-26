import { describe, expect, it } from "vitest";

import { makeHelloMessage } from "./api";

describe("makeHelloMessage", () => {
  it("uses world when name is empty", () => {
    expect(makeHelloMessage("")).toBe("Hello, world!");
  });

  it("uses the provided name", () => {
    expect(makeHelloMessage("Ada")).toBe("Hello, Ada!");
  });
});
