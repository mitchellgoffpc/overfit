import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app";

describe("backend api", () => {
  it("returns a hello message", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/hello")
      .send({ name: "Ada" })
      .expect(200);

    expect(response.body).toEqual({ message: "Hello, Ada!" });
  });
});
