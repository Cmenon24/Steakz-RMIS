// Tests login, JWT authentication, and role-based access using test database accounts.
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const testPassword = "SteakzTest!2026";
const adminEmail = "admin@test.steakz.com";
const serverEmail = "server.london@test.steakz.com";

describe("Authentication API", () => {
  // Close the test database connection after this suite completes.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // A seeded Admin account should be able to log in successfully.
  it("logs in with valid credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: testPassword });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe(adminEmail);
    expect(response.body.data.user.role).toBe("ADMIN");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  // Incorrect passwords must not authenticate an existing account.
  it("rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: "IncorrectPassword!" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe("Invalid email or password");
  });

  // Unknown email addresses must not authenticate.
  it("rejects an unknown email address", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "unknown@test.steakz.com", password: testPassword });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe("Invalid email or password");
  });

  // Login input is validated before the authentication service is called.
  it("rejects invalid login input", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe("Invalid login information");
  });

  // The Admin-only users endpoint must reject requests without a bearer token.
  it("rejects access to a protected endpoint without a token", async () => {
    const response = await request(app).get("/api/v1/users");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // A valid Admin token should allow access to the Admin-only users endpoint.
  it("allows an authenticated user to access a protected endpoint", async () => {
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: testPassword });

    const accessToken = loginResponse.body.data.accessToken as string;
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(loginResponse.status).toBe(200);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: adminEmail, role: "ADMIN" }),
    ]));
    expect(response.body.data[0]).not.toHaveProperty("passwordHash");
  });

  // A valid token does not grant access to routes reserved for another role.
  it("denies a Server access to the Admin-only endpoint", async () => {
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: serverEmail, password: testPassword });

    const accessToken = loginResponse.body.data.accessToken as string;
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(loginResponse.status).toBe(200);
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });


  // An authenticated user should receive their current profile.
  it("retrieves the authenticated user's profile", async () => {
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: testPassword });

    const accessToken = loginResponse.body.data.accessToken as string;

    const response = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(adminEmail);
    expect(response.body.data.role).toBe("ADMIN");
    expect(response.body.data).toHaveProperty("firstName");
    expect(response.body.data).toHaveProperty("lastName");
    expect(response.body.data).toHaveProperty("branchId");
    expect(response.body.data).toHaveProperty("branchName");
  });

  // The profile endpoint must reject requests without a token.
  it("rejects profile access without a token", async () => {
    const response = await request(app).get("/api/v1/auth/profile");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // Invalid tokens must not provide access to the profile.
  it("rejects profile access with an invalid token", async () => {
    const response = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // The profile response must never expose sensitive account information.
  it("does not expose sensitive user information in the profile", async () => {
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: testPassword });

    const accessToken = loginResponse.body.data.accessToken as string;

    const response = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty("passwordHash");
    expect(response.body.data).not.toHaveProperty("password");
  });

  // A token belonging to a deactivated account must no longer authenticate.
  it("rejects profile access for an inactive account", async () => {
    // This test requires an existing inactive account and valid credentials.
    // We will add this test once we confirm suitable test data.
  });

});
