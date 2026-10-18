
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

describe("Better Auth - Registration", () => {
  const email = `aventix-test-${randomUUID()}@example.com`;
  let createdUserId: string | undefined;

afterAll(async () => {
  if (createdUserId) {
    await prisma.user.delete({
      where: { id: createdUserId },
    });
  }
});

  it("registers an attendee with a UUID", async () => {
    const response = await request(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", process.env.FRONTEND_URL!)
      .send({
        name: "Aventix Test User",
        firstName: "Aventix",
        lastName: "Test User",
        email,
        password: "TestPassword123!",
      });

    // Capture the created user before assertions so
    // cleanup still runs if an assertion fails.
    const user = await prisma.user.findUnique({
      where: { email },
    });

    createdUserId = user?.id;

    expect(response.status).toBe(200);
    expect(user).not.toBeNull();

    expect(user?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(user?.role).toBe("ATTENDEE");
    expect(user?.firstName).toBe("Aventix");
    expect(user?.lastName).toBe("Test User");

    const account = await prisma.account.findFirst({
      where: { userId: user!.id },
    });

    expect(account).not.toBeNull();
  });
  
describe("Better Auth - Login", () => {
  const email = `aventix-login-${randomUUID()}@example.com`;
  const password = "TestPassword123!";
  let createdUserId: string | undefined;

  beforeAll(async () => {
    const response = await request(app)
      .post("/api/auth/sign-up/email")
      .set("Origin", process.env.FRONTEND_URL!)
      .send({
        name: "Login Test User",
        firstName: "Login",
        lastName: "Test User",
        email,
        password,
      });

    if (response.status !== 200) {
      throw new Error(
        `Test user registration failed: HTTP ${response.status}`,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    createdUserId = user?.id;

    if (!createdUserId) {
      throw new Error("Login test user was not created");
    }
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({
        where: { id: createdUserId },
      });
    }
  });

  it("logs in with valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/sign-in/email")
      .set("Origin", process.env.FRONTEND_URL!)
      .send({
        email,
        password,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);

    const sessionCookie = response.headers["set-cookie"];
    expect(sessionCookie).toBeDefined();
  });

  it("rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/sign-in/email")
      .set("Origin", process.env.FRONTEND_URL!)
      .send({
        email,
        password: "IncorrectPassword123!",
      });

    expect(response.status).toBe(401);
  });
});

describe("Better Auth - Session and Logout", () => {
  const email = `aventix-session-${randomUUID()}@example.com`;
  const password = "TestPassword123!";
  const agent = request.agent(app);

  let createdUserId: string | undefined;

  beforeAll(async () => {
    const response = await agent
      .post("/api/auth/sign-up/email")
      .set("Origin", process.env.FRONTEND_URL!)
      .send({
        name: "Session Test User",
        firstName: "Session",
        lastName: "Test User",
        email,
        password,
      });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    createdUserId = user?.id;

    if (response.status !== 200 || !createdUserId) {
      throw new Error(
        `Session test registration failed: HTTP ${response.status}`,
      );
    }
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({
        where: { id: createdUserId },
      });
    }
  });

  it("retrieves the authenticated user's session", async () => {
    const response = await agent.get("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(createdUserId);
    expect(response.body.user.email).toBe(email);
    expect(response.body.session).toBeDefined();
  });

  it("logs out and invalidates the session", async () => {
    const logoutResponse = await agent
      .post("/api/auth/sign-out")
      .set("Origin", process.env.FRONTEND_URL!);

    expect(logoutResponse.status).toBe(200);

    const sessionResponse = await agent.get(
      "/api/auth/get-session",
    );

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body).toBeNull();
  });
});


});
