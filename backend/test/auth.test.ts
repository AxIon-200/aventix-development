import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

// Native signup previously created a session. The approved Phase 1 surface
// replaces these operations; later tickets add the remaining Aventix endpoints.
describe("Authentication HTTP boundary", () => {
  it.each([
    "/sign-up/email", "/sign-in/email", "/send-verification-email",
    "/reset-password/arbitrary",
    "/change-password", "/update-user", "/change-email", "/delete-user",
    "/set-password", "/link-social", "/revoke-sessions", "/sign-out", "/get-session",
    "/callback/provider", "/register/", "/REGISTER", "/%72egister", "//register",
    "/verify-email/", "/VERIFY-EMAIL", "/%76erify-email", "//verify-email",
    "/resend-verification/", "/RESEND-VERIFICATION", "/%72esend-verification", "//resend-verification",
    "/login/", "/LOGIN", "/%6cogin", "//login",
    "/logout/", "/LOGOUT", "/%6cogout", "//logout", "/own-profile",
    "/request-password-reset/", "/REQUEST-PASSWORD-RESET", "/%72equest-password-reset", "//request-password-reset",
    "/reset-password/", "/RESET-PASSWORD", "/%72eset-password", "//reset-password",
  ])("denies native or alternate route %s", async path => {
    const response = await request(app).post(`/api/auth${path}`)
      .set("Origin", process.env.FRONTEND_URL!).send({});
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it.each(["/get-session", "/sign-up/email"])("denies native GET %s", async path => {
    const response = await request(app).get(`/api/auth${path}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it.each(["/verify-email?token=fixture", "/resend-verification", "/request-password-reset", "/reset-password?token=fixture"])("rejects GET on mutation %s", async path => {
    const response = await request(app).get(`/api/auth${path}`);
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("POST");
    expect(response.body.error.code).toBe("METHOD_NOT_ALLOWED");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("returns the allowed method for the registration route", async () => {
    const response = await request(app).get("/api/auth/register");
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("POST");
    expect(response.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });
});
