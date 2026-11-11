
// Tests the basic Express application responses.
import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";

describe("Express application", () => {
  // Confirms the API root endpoint responds successfully.
  it("should return a welcome message from the root endpoint", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Welcome to Steakz RMIS API");
  });

  // Confirms unknown API routes return a 404 response.
  it("should return 404 for an unknown route", async () => {
    const response = await request(app).get("/api/v1/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Route not found");
  });
});
