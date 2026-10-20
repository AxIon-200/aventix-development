import { describe, it, expect } from "vitest";
import request from "supertest";

import app from "../src/app.js";

describe("Health Endpoint", () => {
  it("should return HTTP 200", async () => {
    const response = await request(app)
      .get("/api/v1/health");

    expect(response.status).toBe(200);
  });
});